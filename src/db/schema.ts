import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';

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

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  amount: integer('amount').notNull(),
  category: text('category').notNull(),
  dayOfMonth: integer('day_of_month').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const financeTransactions = sqliteTable(
  'finance_transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    amount: integer('amount').notNull(),
    category: text('category').notNull(),
    date: text('date').notNull(),
    note: text('note').notNull().default(''),
    recurringId: integer('recurring_id').references(() => recurringExpenses.id, {
      onDelete: 'set null',
    }),
    billingMonth: text('billing_month'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('finance_transactions_recurring_month_uidx')
      .on(table.recurringId, table.billingMonth)
      .where(sql`${table.recurringId} IS NOT NULL`),
  ],
);

export const recurringGenerations = sqliteTable(
  'recurring_generations',
  {
    recurringId: integer('recurring_id')
      .notNull()
      .references(() => recurringExpenses.id, { onDelete: 'cascade' }),
    billingMonth: text('billing_month').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.recurringId, table.billingMonth] })],
);

export const monthlyBudgets = sqliteTable('monthly_budgets', {
  month: text('month').primaryKey(),
  amount: integer('amount').notNull(),
  updatedAt: text('updated_at').notNull(),
});
