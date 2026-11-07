// Kiểu chi tiết run (TIP-019b §5.2) — cùng schema với API thật (`packages/shared/api/ai-runs`).
export type { RunChildDto as RunChild, RunDetailDto as RunDetail, RunLifecycle, RunStepDto as RunStep } from '@appchat/shared';

export interface RunPage<T> {
  data: T[];
  next_cursor: string | null;
}
