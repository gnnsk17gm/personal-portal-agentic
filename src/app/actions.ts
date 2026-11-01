'use server';

import { revalidatePath } from 'next/cache';
import { createCapture } from '@/services/captureService';
import { toggleTaskStatus } from '@/services/taskService';

export interface CaptureState {
  ok: boolean;
  error: string | null;
  nonce: number;
}

export async function toggleTaskAction(id: number): Promise<void> {
  if (!Number.isInteger(id)) return;
  toggleTaskStatus(id);
  revalidatePath('/');
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
