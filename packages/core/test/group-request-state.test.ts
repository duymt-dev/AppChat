// TIP-023b SPEC D: máy trạng thái yêu cầu tạo nhóm ở worker (GroupCreators.run) — không phiên → lỗi trước khi ghi attempt (thử lại an toàn);
// queued → running (attempt) → succeeded / unknown; running khi job chạy lại → unknown, không gọi nhà cung cấp lần hai; request đã xong → bỏ.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ChannelNotRunningError, type ChannelAdapter } from '@appchat/channels';
import { GroupCreators } from '../src/channels/jobs/create-group.processor';

const ACC = '7c1e2b8a-0000-4000-8000-0000000000a1';

function rig(status: string, o: { running?: boolean; fail?: Error; hang?: boolean } = {}) {
  const row = { id: 'r1', channelAccountId: ACC, name: 'Nhóm', status, participants: [{ external_id: 'zl_a' }] } as Record<string, unknown>;
  const calls: string[] = [];
  const reports: Record<string, unknown>[] = [];
  const db = {
    conversationGroupRequest: {
      findUnique: async () => ({ ...row }),
      updateMany: async ({ where, data }: { where: { status: string }; data: { status: string } }) => {
        if (row.status !== where.status) return { count: 0 };
        row.status = data.status;
        calls.push('attempt');
        return { count: 1 };
      },
    },
  };
  const adapter = {
    manifest: { capabilities: { createGroup: true } },
    isRunning: () => o.running !== false,
    createGroup: async () => {
      calls.push('provider');
      if (o.hang) return new Promise(() => undefined);
      if (o.fail) throw o.fail;
      return { groupId: 'g1', added: ['zl_a'], failed: [] };
    },
  } as unknown as ChannelAdapter;
  const g = new GroupCreators({
    redis: {} as never,
    tenants: { get: async () => db } as never,
    executor: { execute: async (_c: unknown, _id: string, input: unknown) => void reports.push(input as Record<string, unknown>) } as never,
    log: { warn: () => undefined } as never,
    timeoutMs: 50,
  });
  return { run: () => g.run(ACC, adapter, { ws: 'ws', request_id: 'r1' }), row, calls, reports };
}

describe('GroupCreators.run', () => {
  it('queued + phiên → attempt rồi gọi Zalo một lần → succeeded', async () => {
    const r = rig('queued');
    expect(await r.run()).toBe('succeeded');
    expect(r.calls).toEqual(['attempt', 'provider']);
    expect(r.reports).toEqual([{ request_id: 'r1', outcome: 'succeeded', group_id: 'g1', added: ['zl_a'], failed: [] }]);
  });

  it('không có phiên → ChannelNotRunningError trước attempt (job thử lại), không báo kết quả', async () => {
    const r = rig('queued', { running: false });
    await expect(r.run()).rejects.toBeInstanceOf(ChannelNotRunningError);
    expect([r.calls, r.reports, r.row.status]).toEqual([[], [], 'queued']);
  });

  it('running khi job chạy lại → unknown, KHÔNG gọi Zalo', async () => {
    const r = rig('running');
    expect(await r.run()).toBe('unknown');
    expect(r.calls).toEqual([]);
    expect(r.reports).toEqual([{ request_id: 'r1', outcome: 'unknown', error: 'interrupted_after_attempt' }]);
  });

  it('Zalo lỗi / treo sau attempt → unknown (không thử lại mù)', async () => {
    for (const o of [{ fail: new Error('zalo_group_failed') }, { hang: true }]) {
      const r = rig('queued', o);
      await expect(r.run()).rejects.toThrow();
      expect(r.calls).toEqual(['attempt', 'provider']);
      expect(r.reports[0]).toMatchObject({ outcome: 'unknown' });
    }
  });

  it('request đã xong → bỏ qua', async () => {
    for (const s of ['succeeded', 'failed', 'unknown']) {
      const r = rig(s);
      expect(await r.run()).toBe(s);
      expect(r.calls).toEqual([]);
    }
  });
});
