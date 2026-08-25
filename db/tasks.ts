import { env } from 'cloudflare:workers';

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type Task = {
  id: string; title: string; note: string; dueDate: string | null;
  priority: TaskPriority; tags: string[]; status: TaskStatus; position: number;
  completedAt: string | null; archived: boolean; createdAt: string; updatedAt: string;
};

let ready: Promise<void> | null = null;

async function ensureSchema() {
  if (!ready) ready = (async () => {
    const db = env.DB;
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '', due_date TEXT, priority TEXT NOT NULL DEFAULT 'medium',
        tags TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'todo',
        position INTEGER NOT NULL DEFAULT 0, completed_at TEXT,
        archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )`),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_user_archived_status ON tasks(user_id, archived, status)'),
      db.prepare('CREATE INDEX IF NOT EXISTS idx_tasks_user_archived_due ON tasks(user_id, archived, due_date)'),
    ]);
  })();
  return ready;
}

function mapRow(row: Record<string, unknown>): Task {
  let tags: string[] = [];
  try { tags = JSON.parse(String(row.tags || '[]')); } catch { tags = []; }
  return {
    id: String(row.id), title: String(row.title), note: String(row.note || ''),
    dueDate: row.due_date ? String(row.due_date) : null,
    priority: String(row.priority) as TaskPriority, tags,
    status: String(row.status) as TaskStatus, position: Number(row.position),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    archived: Boolean(row.archived), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function listTasks(userId: string, archived = false) {
  await ensureSchema();
  const result = await env.DB.prepare('SELECT * FROM tasks WHERE user_id = ? AND archived = ? ORDER BY status, position, created_at')
    .bind(userId, archived ? 1 : 0).all<Record<string, unknown>>();
  return result.results.map(mapRow);
}

export async function createTask(userId: string, input: Omit<Task, 'id'|'position'|'completedAt'|'archived'|'createdAt'|'updatedAt'>) {
  await ensureSchema();
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  const max = await env.DB.prepare('SELECT COALESCE(MAX(position), -1) AS value FROM tasks WHERE user_id = ? AND status = ? AND archived = 0').bind(userId, input.status).first<{value:number}>();
  await env.DB.prepare(`INSERT INTO tasks (id,user_id,title,note,due_date,priority,tags,status,position,completed_at,archived,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)`).bind(id,userId,input.title,input.note,input.dueDate,input.priority,JSON.stringify(input.tags),input.status,(max?.value ?? -1)+1,input.status === 'done' ? now : null,now,now).run();
  return (await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(id,userId).first<Record<string,unknown>>()) && mapRow((await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(id,userId).first<Record<string,unknown>>())!);
}

export async function updateTask(userId: string, id: string, changes: Partial<Pick<Task,'title'|'note'|'dueDate'|'priority'|'tags'|'status'|'position'|'archived'>>) {
  await ensureSchema();
  const current = await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(id,userId).first<Record<string,unknown>>();
  if (!current) return null;
  const old = mapRow(current); const next = {...old,...changes}; const now = new Date().toISOString();
  const completedAt = next.status === 'done' ? (old.completedAt || now) : null;
  await env.DB.prepare(`UPDATE tasks SET title=?,note=?,due_date=?,priority=?,tags=?,status=?,position=?,completed_at=?,archived=?,updated_at=? WHERE id=? AND user_id=?`)
    .bind(next.title,next.note,next.dueDate,next.priority,JSON.stringify(next.tags),next.status,next.position,completedAt,next.archived?1:0,now,id,userId).run();
  const row = await env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').bind(id,userId).first<Record<string,unknown>>();
  return row ? mapRow(row) : null;
}

export async function deleteTask(userId: string, id: string) {
  await ensureSchema();
  const result = await env.DB.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ? AND archived = 1').bind(id,userId).run();
  return result.meta.changes > 0;
}
