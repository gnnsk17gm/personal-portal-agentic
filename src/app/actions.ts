'use server';

import { revalidatePath } from 'next/cache';
import { createCapture } from '@/services/captureService';
import { createTask, deleteTask, toggleTaskStatus } from '@/services/taskService';
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
  revalidatePath('/');
  return { ok: true, error: null, nonce: prev.nonce + 1 };
}
