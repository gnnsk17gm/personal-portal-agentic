import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  priority: text('priority', { enum: ['high', 'medium', 'low'] }).notNull().default('medium'),
  status: text('status', { enum: ['todo', 'in_progress', 'done'] }).notNull().default('todo'),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull(),
});

export const captures = sqliteTable('captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const agentRuns = sqliteTable('agent_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goal: text('goal').notNull(),
  status: text('status', { enum: ['running', 'completed', 'failed'] }).notNull().default('running'),
  createdAt: text('created_at').notNull(),
  completedAt: text('completed_at'),
});

export const agentSteps = sqliteTable('agent_steps', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: integer('run_id').notNull(),
  stepName: text('step_name').notNull(), // 例: "analyze_goal", "retrieve_knowledge", "generate_tasks", "persist_tasks"
  status: text('status', { enum: ['success', 'error'] }).notNull().default('success'),
  detail: text('detail').notNull(), // 思考内容や結果サマリー
  agentRole: text('agent_role', { enum: ['researcher', 'planner', 'critic', 'orchestrator'] })
    .notNull()
    .default('orchestrator'),
  createdAt: text('created_at').notNull(),
});

