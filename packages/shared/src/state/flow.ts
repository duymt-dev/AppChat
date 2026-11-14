// Bảng chuyển trạng thái dùng chung BE + mock FE + nút UI + Trợ lý (standards/domain/state-machine.md §2).
import { AppError } from '../errors';

export type Flow<S extends string> = { readonly [K in S]: Readonly<Partial<Record<string, S>>> } & { readonly terminal: readonly S[] };

export function defineFlow<S extends string>(f: Flow<S>): Flow<S> {
  for (const t of f.terminal) {
    const out = f[t] as Partial<Record<string, S>>;
    if (Object.keys(out).length) throw new Error(`Trạng thái cuối "${t}" không được có chuyển đổi đi ra`);
  }
  return f;
}

export function nextState<S extends string>(f: Flow<S>, from: S, actionId: string): S | null {
  const out = (f as Record<string, Partial<Record<string, S>>>)[from];
  return out?.[actionId] ?? null;
}

/** Sai trạng thái → INVALID_TRANSITION 409 kèm `fields.status` = trạng thái hiện tại. */
export function assertTransition<S extends string>(f: Flow<S>, from: S, actionId: string): S {
  const to = nextState(f, from, actionId);
  if (to === null) throw new AppError('INVALID_TRANSITION', 409, { status: from }, `${actionId} not allowed from ${from}`);
  return to;
}

/** Action được phép ở trạng thái hiện tại — FE bật / tắt nút. */
export function allowedActions<S extends string>(f: Flow<S>, from: S): string[] {
  return Object.keys((f as Record<string, Partial<Record<string, S>>>)[from] ?? {});
}

/** Khoá lạc quan (domain/concurrency.md §1): có if_version mà lệch → STALE_VERSION 409. */
export function assertVersion(current: number, ifVersion: number | undefined | null): void {
  if (ifVersion !== undefined && ifVersion !== null && ifVersion !== current) {
    throw new AppError('STALE_VERSION', 409, { version: String(current) });
  }
}
