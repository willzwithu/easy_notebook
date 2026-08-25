import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  note: text('note').notNull().default(''),
  dueDate: text('due_date'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  tags: text('tags').notNull().default('[]'),
  status: text('status', { enum: ['todo', 'doing', 'done'] }).notNull().default('todo'),
  position: integer('position').notNull().default(0),
  completedAt: text('completed_at'),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_tasks_user_archived_status').on(table.userId, table.archived, table.status),
  index('idx_tasks_user_archived_due').on(table.userId, table.archived, table.dueDate),
]);
