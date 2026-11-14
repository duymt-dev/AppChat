// TIP-014b B (unit, transport giả) — gửi bền theo sổ từng phần: đặt chỗ TRƯỚC khi gọi kênh, xác nhận ngay sau ACK; chạy lại bỏ qua phần đã
// xác nhận (không gửi trùng); sổ dừng (phần treo) → không gọi kênh; tệp tải trước khi đặt chỗ, hash theo nội dung tệp. Biên nhận Zalo
// (delivered_messages / seen_messages) → ReceiptEvent theo người nhận, khoá idempotent ổn định theo tập người.
import { describe, expect, it } from 'vitest';
import { FakeZaloTransport, ZaloPersonalAdapter, type ProviderEvent, type ProviderMessageRef, type SendLedger } from '../src';

const ACC = '0190f000-0000-7000-8000-0000000000c1';

async function setup(fetch = async (url: string) => Buffer.from(url)) {
  const transport = new FakeZaloTransport(1);
  const adapter = new ZaloPersonalAdapter(transport, fetch);
  const events: ProviderEvent[] = [];
  const sink = { push: async () => undefined, event: async (e: ProviderEvent) => void events.push(e) };
  const r = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
  return { adapter, events, s: transport.session(ACC)! };
}

/** Sổ trong bộ nhớ ghi lại thứ tự gọi. */
function memLedger() {
  const parts = new Map<number, { hash: string; status: 'reserved' | 'confirmed'; ref?: ProviderMessageRef }>();
  const log: string[] = [];
  const ledger: SendLedger = {
    async reserve(partNo, hash) {
      const p = parts.get(partNo);
      if (p?.status === 'confirmed') {
        log.push(`skip:${partNo}`);
        return { skip: p.ref! };
      }
      if (p?.status === 'reserved') throw new Error(`send_part_unknown:${partNo}`);
      parts.set(partNo, { hash, status: 'reserved' });
      log.push(`reserve:${partNo}`);
      return 'send';
    },
    async confirm(partNo, ref) {
      parts.set(partNo, { ...parts.get(partNo)!, status: 'confirmed', ref });
      log.push(`confirm:${partNo}`);
    },
  };
  return { ledger, parts, log };
}

const long = `${'a'.repeat(1990)} ${'b'.repeat(1990)} ${'c'.repeat(100)}`;

describe('gửi theo sổ từng phần', () => {
  it('đặt chỗ → gọi → xác nhận từng phần theo thứ tự', async () => {
    const { adapter, s } = await setup();
    const m = memLedger();
    const r = await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: long }, m.ledger);
    expect(m.log).toEqual(['reserve:0', 'confirm:0', 'reserve:1', 'confirm:1', 'reserve:2', 'confirm:2']);
    expect(r.parts!.map((p) => p.msgId)).toEqual(s.sent.map((x) => x.id));
  });

  it('chạy lại sau lỗi giữa chừng: phần đã xác nhận bỏ qua (không gửi trùng), chỉ gửi phần còn lại', async () => {
    const { adapter, s } = await setup();
    const m = memLedger();
    s.failNext = 0;
    const orig = s.sendText.bind(s);
    let n = 0;
    s.sendText = async (...a: Parameters<typeof orig>) => {
      if (++n === 2) throw new Error('zalo_network');
      return orig(...a);
    };
    await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: long }, m.ledger).catch(() => undefined);
    // core ghi phần đang đặt chỗ là lỗi chắc chắn (vd. kênh từ chối rõ) → được gửi lại.
    m.parts.delete(1);
    const r = await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: long }, m.ledger);
    expect(s.sent).toHaveLength(3);
    expect(m.log.filter((x) => x === 'skip:0')).toHaveLength(1);
    expect(r.parts!.map((p) => p.msgId)).toEqual(s.sent.map((x) => x.id));
  });

  it('phần treo từ lần trước (sổ ném) → không gọi kênh cho phần đó', async () => {
    const { adapter, s } = await setup();
    const m = memLedger();
    m.parts.set(0, { hash: 'x', status: 'reserved' });
    await expect(adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: 'Chào chị' }, m.ledger)).rejects.toThrow('send_part_unknown:0');
    expect(s.sent).toHaveLength(0);
  });

  it('tệp: tải lỗi → chưa đặt chỗ (thử lại an toàn); hash theo nội dung tệp, không theo link', async () => {
    let body = 'v1';
    const { adapter } = await setup(async (url) => {
      if (url.includes('hong')) throw new Error('attachment_not_found');
      return Buffer.from(body);
    });
    const m = memLedger();
    await expect(adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'file', attachments: [{ url: 'https://x/hong', mime: 'application/pdf' }] }, m.ledger)).rejects.toThrow('attachment_not_found');
    expect(m.log).toEqual([]);
    await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'file', attachments: [{ url: 'https://x/a?sig=1', mime: 'application/pdf' }] }, memLedger().ledger);
    const a = memLedger();
    const b = memLedger();
    await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'file', attachments: [{ url: 'https://x/a?sig=1', mime: 'application/pdf' }] }, a.ledger);
    await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'file', attachments: [{ url: 'https://x/a?sig=2', mime: 'application/pdf' }] }, b.ledger);
    expect(a.parts.get(0)!.hash).toBe(b.parts.get(0)!.hash);
    body = 'v2';
    const c = memLedger();
    await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'file', attachments: [{ url: 'https://x/a?sig=1', mime: 'application/pdf' }] }, c.ledger);
    expect(c.parts.get(0)!.hash).not.toBe(a.parts.get(0)!.hash);
  });
});

describe('biên nhận Zalo', () => {
  it('delivered / seen 1-1 → ReceiptEvent; khoá ổn định không phụ thuộc thứ tự người nhận', async () => {
    const { s, events } = await setup();
    s.emitReceipt({ kind: 'delivered', msgIds: ['7100000001'], ts: '1762311600000' });
    s.emitReceipt({ kind: 'seen', msgIds: ['7100000001'] });
    await new Promise((r) => setTimeout(r, 10));
    const rs = events.filter((e) => e.kind === 'delivered' || e.kind === 'seen');
    expect(rs).toMatchObject([
      { kind: 'delivered', accountId: ACC, threadId: 'zl_khach', isGroup: false, msgIds: ['7100000001'], recipients: ['zl_khach'], at: new Date(1762311600000).toISOString() },
      { kind: 'seen', recipients: ['zl_khach'] },
    ]);
    s.emitReceipt({ kind: 'seen', isGroup: true, threadId: 'g1', msgIds: ['7100000002'], uids: ['u2', 'u1'] });
    s.emitReceipt({ kind: 'seen', isGroup: true, threadId: 'g1', msgIds: ['7100000002'], uids: ['u1', 'u2'] });
    await new Promise((r) => setTimeout(r, 10));
    const g = events.filter((e) => e.kind === 'seen' && e.isGroup);
    expect(g).toHaveLength(2);
    expect(g[0]!.key).toBe(g[1]!.key);
  });

  it('biên nhận rỗng (không msgId / không người) → bỏ', async () => {
    const { s, events } = await setup();
    s.emitReceipt({ kind: 'seen', msgIds: [] });
    s.emitReceipt({ kind: 'delivered', msgIds: ['7100000003'], uids: [] });
    await new Promise((r) => setTimeout(r, 10));
    expect(events.filter((e) => e.kind === 'delivered' || e.kind === 'seen')).toEqual([]);
  });
});
