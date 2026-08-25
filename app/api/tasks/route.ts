import { getChatGPTUser } from '../../chatgpt-auth';
import { createTask, deleteTask, listTasks, TaskPriority, TaskStatus, updateTask } from '../../../db/tasks';

const statuses = new Set(['todo','doing','done']);
const priorities = new Set(['low','medium','high']);
const bad = (message: string, status = 400) => Response.json({error:message},{status});

export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return bad('请先登录',401);
  const archived = new URL(request.url).searchParams.get('archived') === 'true';
  return Response.json({tasks:await listTasks(user.userId, archived)});
}

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return bad('请先登录',401);
  const body = await request.json() as Record<string,unknown>;
  const title = String(body.title || '').trim(); if (!title || title.length > 120) return bad('标题需为 1–120 个字符');
  const status = String(body.status || 'todo'); const priority = String(body.priority || 'medium');
  if (!statuses.has(status) || !priorities.has(priority)) return bad('任务状态或优先级无效');
  const dueDate = body.dueDate ? String(body.dueDate) : null;
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return bad('日期格式无效');
  const tags = Array.isArray(body.tags) ? body.tags.map(String).map(x=>x.trim()).filter(Boolean).slice(0,6) : [];
  const task = await createTask(user.userId,{title,note:String(body.note||'').slice(0,1000),dueDate,priority:priority as TaskPriority,tags,status:status as TaskStatus});
  return Response.json({task},{status:201});
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser(); if (!user) return bad('请先登录',401);
  const body = await request.json() as Record<string,unknown>; const id = String(body.id || '');
  if (!id) return bad('缺少任务 ID');
  const changes: Record<string,unknown> = {};
  if ('title' in body) { const title=String(body.title||'').trim(); if(!title||title.length>120)return bad('标题需为 1–120 个字符'); changes.title=title; }
  if ('note' in body) changes.note=String(body.note||'').slice(0,1000);
  if ('dueDate' in body) { const value=body.dueDate?String(body.dueDate):null; if(value&&!/^\d{4}-\d{2}-\d{2}$/.test(value))return bad('日期格式无效'); changes.dueDate=value; }
  if ('priority' in body) { if(!priorities.has(String(body.priority)))return bad('优先级无效'); changes.priority=body.priority; }
  if ('status' in body) { if(!statuses.has(String(body.status)))return bad('任务状态无效'); changes.status=body.status; }
  if ('tags' in body) changes.tags=Array.isArray(body.tags)?body.tags.map(String).map(x=>x.trim()).filter(Boolean).slice(0,6):[];
  if ('position' in body) changes.position=Math.max(0,Number(body.position)||0);
  if ('archived' in body) changes.archived=Boolean(body.archived);
  const task=await updateTask(user.userId,id,changes); if(!task)return bad('任务不存在',404);
  return Response.json({task});
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser(); if (!user) return bad('请先登录',401);
  const id = new URL(request.url).searchParams.get('id'); if(!id)return bad('缺少任务 ID');
  if(!await deleteTask(user.userId,id))return bad('只能永久删除已归档任务',409);
  return new Response(null,{status:204});
}
