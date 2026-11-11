'use server';

import { revalidatePath } from 'next/cache';
import { createCapture, deleteCapture } from '@/services/captureService';
import { createTask, deleteTask, toggleTaskStatus } from '@/services/taskService';
import { decomposeGoal } from '@/services/taskDecomposerService';
import { runHealthSweep } from '@/services/sweeperService';
import { generateRemediationPlan, applyRemediations } from '@/services/remediationService';
import type { TaskPreview } from '@/types/portal';

export interface CaptureState {
  ok: boolean;
  error: string | null;
  nonce: number;
}

export interface TaskFormState {
  ok: boolean;
  error: string | null;
  nonce: number;
}

export interface DecomposeFormState {
  ok: boolean;
  error: string | null;
  createdCount: number;
  nonce: number;
}


function revalidateNoteViews(): void {
  revalidatePath('/');
  revalidatePath('/notes');
}

function revalidateTaskViews(): void {
  revalidatePath('/');
  revalidatePath('/tasks');
}

export async function toggleTaskAction(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  toggleTaskStatus(id);
  revalidateTaskViews();
}

export async function createTaskAction(prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const title = formData.get('title');
  const priority = formData.get('priority');
  const dueDate = formData.get('dueDate');
  try {
    createTask({
      title: typeof title === 'string' ? title : '',
      priority: typeof priority === 'string' ? (priority as TaskPreview['priority']) : undefined,
      dueDate: typeof dueDate === 'string' ? dueDate : null,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'タスクの作成に失敗しました', nonce: prev.nonce + 1 };
  }
  revalidateTaskViews();
  return { ok: true, error: null, nonce: prev.nonce + 1 };
}

export async function deleteTaskAction(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  deleteTask(id);
  revalidateTaskViews();
}

export async function saveCaptureAction(prev: CaptureState, formData: FormData): Promise<CaptureState> {
  const raw = formData.get('content');
  const content = typeof raw === 'string' ? raw.trim() : '';
  if (content.length === 0) {
    return { ok: false, error: 'メモを入力してください', nonce: prev.nonce + 1 };
  }
  createCapture(content);
  revalidateNoteViews();
  return { ok: true, error: null, nonce: prev.nonce + 1 };
}

/** /notes からのノート追加（長文対応）。 */
export async function createNoteAction(prev: CaptureState, formData: FormData): Promise<CaptureState> {
  return saveCaptureAction(prev, formData);
}

export async function deleteNoteAction(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  deleteCapture(id);
  revalidateNoteViews();
}

export async function decomposeGoalAction(
  prev: DecomposeFormState,
  formData: FormData
): Promise<DecomposeFormState> {
  const goal = formData.get('goal');
  const goalText = typeof goal === 'string' ? goal : '';
  try {
    const result = decomposeGoal(goalText);
    revalidateTaskViews();
    return {
      ok: true,
      error: null,
      createdCount: result.createdTasks.length,
      nonce: prev.nonce + 1,
    };
  } catch (e) {
    revalidateTaskViews();
    return {
      ok: false,
      error: e instanceof Error ? e.message : '目標の分解に失敗しました',
      createdCount: 0,
      nonce: prev.nonce + 1,
    };
  }
}

export async function runHealthSweepAction(): Promise<{ ok: boolean; error: string | null }> {
  try {
    runHealthSweep();
    revalidatePath('/');
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : '診断の実行に失敗しました',
    };
  }
}

export async function applyRemediationAction(): Promise<{
  ok: boolean;
  error: string | null;
  appliedCount: number;
}> {
  try {
    // サーバー側で最新DBからプランを再生成して適用（競合防止）
    const plan = generateRemediationPlan();
    const result = applyRemediations(plan);
    revalidateTaskViews();
    return {
      ok: true,
      error: null,
      appliedCount: result.appliedCount,
    };
  } catch (e) {
    revalidateTaskViews();
    return {
      ok: false,
      error: e instanceof Error ? e.message : '是正の適用に失敗しました',
      appliedCount: 0,
    };
  }
}


