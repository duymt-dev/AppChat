// TIP-014b C (unit, transport giả) — lịch sử Zalo có giới hạn: lùi trang theo lastId cho 1-1 và nhóm; dừng khi chạm mốc cắt (complete),
// trang rỗng (provider_limit — không giả đủ khoảng), trần trang / tin (partial), trang không về (timeout); mỗi lô chờ core lưu xong rồi
// mới xin trang sau; lỗi lưu → ném ra (không nuốt); tin của chính tài khoản bị bỏ; báo cáo khoảng thực thấy.
import { describe, expect, it } from 'vitest';
import { FakeZaloTransport, ZaloPersonalAdapter, type HistoryRequest, type NormalizedInbound } from '../src';

const ACC = '0190f000-0000-7000-8000-0000000000d1';
const DAY = 86_400_000;
const NOW = Date.parse('2026-11-05T03:00:00Z');

async function setup() {
  const transport = new FakeZaloTransport(1);
  const adapter = new ZaloPersonalAdapter(transport, async () => Buffer.from(''));
  const r = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, { push: async () => undefined });
  return { adapter, s: transport.session(ACC)! };
}

const msg = (n: number, ageDays: number, over: Record<string, unknown> = {}) => ({
  isGroup: false,
  isSelf: false,
  threadId: 'zl_khach',
  msgId: String(7_100_000_000 + n),
  uidFrom: 'zl_khach',
  ts: String(NOW - ageDays * DAY),
  msgType: 'webchat',
  content: `tin ${n}`,
  ...over,
});
const req = (over: Partial<HistoryRequest> = {}): HistoryRequest => ({ cutoffAt: new Date(NOW - 7 * DAY).toISOString(), maxPages: 20, maxMessages: 1000, pageTimeoutMs: 200, ...over });

describe('lịch sử Zalo theo trang', () => {
  it('chạm mốc cắt → complete; chỉ tin trong khoảng; lùi trang theo lastId; tin tự gửi bỏ', async () => {
    const { adapter, s } = await setup();
    s.historyPage = 3;
    s.history = [msg(1, 1), msg(2, 2), msg(3, 3, { isSelf: true, uidFrom: '1' }), msg(4, 5), msg(5, 6), msg(6, 9), msg(7, 12), msg(8, 1, { isGroup: true, threadId: 'g1', uidFrom: 'u2' }), msg(9, 10, { isGroup: true, threadId: 'g1', uidFrom: 'u2' })];
    const got: NormalizedInbound[] = [];
    const r = await adapter.fetchHistory(ACC, req(), async (b) => void got.push(...b));
    expect(got.map((m) => m.externalMsgId).sort()).toEqual(['7100000001', '7100000002', '7100000004', '7100000005', '7100000008'].sort());
    expect(r).toMatchObject({ status: 'complete', inRange: 5 });
    expect(r.pages).toBe(3);
    // Trang 1-1 thứ hai chạm tin 9 ngày → dừng (tin 12 ngày không bị xin); nhóm: trang đầu đã có tin 10 ngày.
    expect(r.earliestAt).toBe(new Date(NOW - 10 * DAY).toISOString());
    expect(r.latestAt).toBe(new Date(NOW - 1 * DAY).toISOString());
  });

  it('nhà cung cấp hết dữ liệu trước mốc → provider_limit (không giả đủ khoảng)', async () => {
    const { adapter, s } = await setup();
    s.history = [msg(1, 1), msg(2, 2)];
    const r = await adapter.fetchHistory(ACC, req({ cutoffAt: new Date(NOW - 90 * DAY).toISOString() }), async () => undefined);
    expect(r).toMatchObject({ status: 'provider_limit', inRange: 2 });
  });

  it('trần trang → partial; số lần xin trang bị chặn', async () => {
    const { adapter, s } = await setup();
    s.historyPage = 1;
    s.history = Array.from({ length: 30 }, (_, i) => msg(i + 1, i * 0.1));
    const r = await adapter.fetchHistory(ACC, req({ maxPages: 4 }), async () => undefined);
    expect(r).toMatchObject({ status: 'partial', pages: 4 });
    expect(s.historyRequests).toBe(4);
  });

  it('trang không về → timeout', async () => {
    const { adapter, s } = await setup();
    s.historyHang = true;
    const r = await adapter.fetchHistory(ACC, req({ pageTimeoutMs: 50 }), async () => undefined);
    expect(r.status).toBe('timeout');
    expect(r.pages).toBe(0);
  });

  it('lô chờ lưu xong mới xin trang sau; lưu lỗi → ném ra (không nuốt)', async () => {
    const { adapter, s } = await setup();
    s.historyPage = 1;
    s.history = [msg(1, 1), msg(2, 2), msg(3, 9)];
    const order: string[] = [];
    await adapter.fetchHistory(ACC, req(), async (b) => {
      order.push(`save:${b[0]!.externalMsgId}:${s.historyRequests}`);
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(order).toEqual(['save:7100000001:1', 'save:7100000002:2']);
    await expect(adapter.fetchHistory(ACC, req(), async () => Promise.reject(new Error('queue_down')))).rejects.toThrow('queue_down');
  });
});
