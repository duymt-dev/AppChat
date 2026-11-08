// TIP-026b §4.6: hàng đợi bản nháp bố cục — gõ nhanh 5 lần trong lúc lệnh đầu chạy → đúng 2 lần ghi (lần đầu + bản mới nhất), mỗi lần gửi
// if_version đã tiến; 409 → dừng tự lưu, giữ nháp, trạng thái conflict; rebase (Ghi đè) ghi lại nháp với version mới; lỗi khác → error.
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@appchat/shared';
import { createDraftQueue, type DraftStatus } from './useProfileLayoutDraft';
import type { LayoutTab } from '../types';

const tab = (label: string): LayoutTab[] => [{ key: 'overview', label, enabled: true, sort: 0, builtin: true, blocks: [] }];
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const p = new Promise<T>((r) => (resolve = r));
  return { p, resolve };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('createDraftQueue', () => {
  it('gộp: 1 lệnh đang chạy + 4 lần sửa → lần ghi thứ hai là bản mới nhất, version tiến', async () => {
    const calls: { if_version?: number; patch: { tabs: LayoutTab[] } }[] = [];
    const first = deferred<{ result: { version: number } }>();
    const run = vi.fn((input: unknown) => {
      calls.push(input as never);
      return calls.length === 1 ? first.p : Promise.resolve({ result: { version: 3 } });
    });
    const status: DraftStatus[] = [];
    const q = createDraftQueue({ layoutId: 'pl_1', version: 1, run, onStatus: (s) => status.push(s), onVersion: () => {} });
    q.push(tab('a'));
    for (const l of ['ab', 'abc', 'abcd', 'abcde']) q.push(tab(l));
    expect(run).toHaveBeenCalledTimes(1);
    first.resolve({ result: { version: 2 } });
    await tick();
    await tick();
    expect(calls.map((c) => [c.if_version, c.patch.tabs[0]!.label])).toEqual([
      [1, 'a'],
      [2, 'abcde'],
    ]);
    expect(status.at(-1)).toBe('saved');
    expect(q.busy).toBe(false);
  });

  it('409 → conflict, dừng tự lưu, giữ nháp; rebase → ghi lại nháp với version server', async () => {
    const calls: { if_version?: number; patch: { tabs: LayoutTab[] } }[] = [];
    let n = 0;
    const run = vi.fn(async (input: unknown, opts: { onError: (e: ApiRequestError) => boolean }) => {
      calls.push(input as never);
      if (++n === 1) {
        opts.onError(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'v' }));
        return null;
      }
      return { result: { version: 6 } };
    });
    const status: DraftStatus[] = [];
    const q = createDraftQueue({ layoutId: 'pl_1', version: 1, run, onStatus: (s) => status.push(s), onVersion: () => {} });
    q.push(tab('mine'));
    await tick();
    expect(status.at(-1)).toBe('conflict');
    q.push(tab('mine 2'));
    await tick();
    expect(run).toHaveBeenCalledTimes(1);
    q.rebase(5);
    await tick();
    expect(calls[1]).toMatchObject({ if_version: 5, patch: { tabs: tab('mine 2') } });
    expect(status.at(-1)).toBe('saved');
  });

  it('lỗi khác (null) → error, nháp còn chờ lần sửa sau', async () => {
    const run = vi.fn(async () => null);
    const status: DraftStatus[] = [];
    const q = createDraftQueue({ layoutId: 'pl_1', version: 1, run, onStatus: (s) => status.push(s), onVersion: () => {} });
    q.push(tab('x'));
    await tick();
    expect(status.at(-1)).toBe('error');
    expect(q.busy).toBe(true);
  });
});
