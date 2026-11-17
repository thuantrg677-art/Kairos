// Gọi AI qua Supabase Edge Function "ai" (khóa Gemini chỉ nằm ở server).
// Mọi tác vụ AI trong app đều đi qua askAI(); lỗi được đổi sang câu tiếng Việt dễ hiểu.

import { useCallback, useState } from 'react';
import { create } from 'zustand';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useStore } from './store';
import { todayISO } from './dates';
import type { Task } from './types';

// ---------- Kiểu dữ liệu trả về của từng tác vụ ----------
export interface AITask {
  title: string;
  kind: Task['kind'];
  weekdays: number[];
  due_date: string | null;
  estimate_min: number;
  leverage: Task['leverage'];
  reason: string;
}

export interface AIResults {
  suggest_tasks: { tasks: AITask[]; note: string };
  label: { labels: { index: number; leverage: Task['leverage']; reason: string }[] };
  phrase: { options: { title: string; detail: string }[]; note: string };
  align: { score: number; verdict: string; comment: string; suggestion: string };
  inbox: { items: ({ item_id: string; tip: string } & ({ action: 'task'; task: AITask & { goal_id: string | null } } | { action: 'note' }))[] };
  schedule: { placed: { task_id: string; start_min: number; duration_min: number }[]; left: string[]; note: string };
}
export type AIAction = keyof AIResults;

export type AIErrorCode = 'demo' | 'offline' | 'quota' | 'not_setup' | 'busy' | 'auth' | 'bad_request' | 'no_space' | 'failed';
export class AIError extends Error {
  constructor(
    public code: AIErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/** Số lượt AI còn lại hôm nay (null = chưa biết) */
export const useAIQuota = create<{ remaining: number | null; limit: number }>(() => ({ remaining: null, limit: 15 }));

interface Reply {
  ok: boolean;
  data?: unknown;
  code?: AIErrorCode;
  message?: string;
  remaining?: number;
  limit?: number;
}

export async function askAI<A extends AIAction>(action: A, payload: Record<string, unknown> = {}): Promise<AIResults[A]> {
  const s = useStore.getState();
  if (s.mode !== 'cloud' || !supabase) throw new AIError('demo', 'Tính năng AI cần đăng nhập tài khoản, chế độ xem thử chưa dùng được.');
  if (!s.online) throw new AIError('offline', 'Bạn đang offline. Có mạng lại là dùng AI được ngay.');

  let reply: Reply | null = null;
  const { data, error } = await supabase.functions.invoke('ai', { body: { action, today: todayISO(), ...payload } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      reply = await res.json().catch(() => null);
      if (!reply && res.status === 404) throw new AIError('not_setup', 'AI chưa được bật: chưa tạo Edge Function "ai" trong Supabase.');
    } else if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new AIError(
        navigator.onLine ? 'not_setup' : 'offline',
        navigator.onLine ? 'Không gọi được AI. Có thể Edge Function "ai" chưa được tạo trong Supabase.' : 'Bạn đang offline.',
      );
    }
    if (!reply) throw new AIError('failed', 'Không gọi được AI. Bạn thử lại sau nhé.');
  } else reply = data as Reply;

  if (reply && typeof reply.remaining === 'number') useAIQuota.setState({ remaining: reply.remaining, limit: reply.limit ?? 15 });
  if (!reply?.ok) throw new AIError(reply?.code ?? 'failed', reply?.message ?? 'AI chưa trả lời được. Bạn thử lại sau nhé.');
  return reply.data as AIResults[A];
}

/** Kiểm tra AI đã bật chưa và còn bao nhiêu lượt (không tốn lượt). */
export async function checkAI(): Promise<{ state: 'ready' | 'no_key' | 'missing' | 'demo' | 'offline' | 'error'; model?: string }> {
  const s = useStore.getState();
  if (s.mode !== 'cloud' || !supabase) return { state: 'demo' };
  if (!s.online) return { state: 'offline' };
  const { data, error } = await supabase.functions.invoke('ai', { body: { action: 'status' } });
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    return { state: status === 404 || error instanceof FunctionsRelayError || error instanceof FunctionsFetchError ? 'missing' : 'error' };
  }
  if (!data?.ok) return { state: 'error' };
  useAIQuota.setState({ remaining: data.remaining, limit: data.limit ?? 15 });
  return { state: data.data?.configured ? 'ready' : 'no_key', model: data.data?.model };
}

/**
 * Hook tiện dụng cho nút AI: giữ trạng thái "đang nghĩ", tự hiện thông báo lỗi.
 * run() trả về kết quả, hoặc null nếu lỗi (onError nhận lỗi nếu muốn tự xử lý, vd chuyển sang cách xếp theo quy tắc).
 */
export function useAI() {
  const [busy, setBusy] = useState<AIAction | null>(null);
  const run = useCallback(async <A extends AIAction>(action: A, payload: Record<string, unknown> = {}, opts: { silent?: boolean } = {}) => {
    setBusy(action);
    try {
      return { result: await askAI(action, payload), error: null };
    } catch (err) {
      const e = err instanceof AIError ? err : new AIError('failed', 'AI chưa trả lời được. Bạn thử lại sau nhé.');
      if (!(err instanceof AIError)) console.error('[Kairos] AI:', err);
      if (!opts.silent) useStore.getState().toast(e.message, e.code === 'failed' ? 'error' : 'info');
      return { result: null, error: e };
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, run };
}
