// TIP-014 AC2 — adapter Zalo cá nhân trên transport giả (Q-003): QR → credential, start bằng credential, nhận tin, gửi chữ
// (rich text, chia đoạn) / file / sticker, probe, hết phiên (bị đá), đồng bộ lịch sử, stop.
import { describe, expect, it, vi } from 'vitest';
import { ChannelAuthError, ChannelNotRunningError, FakeZaloTransport, ZaloPersonalAdapter, type LoginEvent, type NormalizedInbound } from '../src';

const ACC = '0190f000-0000-7000-8000-0000000000a1';

const setup = () => {
  const transport = new FakeZaloTransport(5);
  const adapter = new ZaloPersonalAdapter(transport, async (url) => Buffer.from(url));
  const inbox: NormalizedInbound[] = [];
  const statuses: string[] = [];
  const sink = { push: async (m: NormalizedInbound) => void inbox.push(m), status: (_id: string, h: string) => void statuses.push(h) };
  return { transport, adapter, inbox, statuses, sink };
};

const login = async (adapter: ZaloPersonalAdapter) => {
  const events: LoginEvent[] = [];
  const r = await adapter.beginLogin(ACC, (e) => events.push(e), new AbortController().signal);
  return { r, events };
};

describe('ZaloPersonalAdapter', () => {
  it('beginLogin: phát QR → đã quét → credential + uid + tên kèm SĐT', async () => {
    const { adapter } = setup();
    const { r, events } = await login(adapter);
    expect(events.map((e) => e.type)).toEqual(['qr', 'scanned']);
    expect(events[0]).toMatchObject({ type: 'qr', image: expect.any(String) });
    expect(r).toMatchObject({ externalId: expect.stringMatching(/^zl_/), name: 'Zalo thử nghiệm · 0909 000 111' });
    expect(r.credentials).toMatchObject({ imei: r.externalId, userAgent: 'appchat-fake' });
  });

  it('beginLogin huỷ (signal) / từ chối → lỗi', async () => {
    const { adapter, transport } = setup();
    transport.autoScan = false;
    const ac = new AbortController();
    const p = adapter.beginLogin(ACC, () => undefined, ac.signal);
    ac.abort();
    await expect(p).rejects.toThrow();
    transport.autoScan = 'decline';
    const events: LoginEvent[] = [];
    await expect(adapter.beginLogin(ACC, (e) => events.push(e), new AbortController().signal)).rejects.toThrow();
    expect(events.at(-1)).toEqual({ type: 'declined' });
  });

  it('start bằng credential → nhận tin chuẩn hoá; credential thu hồi → ChannelAuthError', async () => {
    const { adapter, transport, inbox, sink } = setup();
    const { r } = await login(adapter);
    await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
    expect(await adapter.probe(ACC)).toBe('connected');
    transport.session(ACC)!.inject({ msgId: '1', text: 'Shop ơi' });
    transport.session(ACC)!.inject({ msgId: '2', text: 'tin của mình', isSelf: true });
    await vi.waitFor(() => expect(inbox).toHaveLength(1));
    expect(inbox[0]).toMatchObject({ channelAccountId: ACC, externalMsgId: '1', kind: 'text', text: 'Shop ơi' });

    transport.revoked.add(r.externalId);
    await expect(adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink)).rejects.toBeInstanceOf(ChannelAuthError);
  });

  it('send: chữ dài chia đoạn có style, file tải về Buffer, sticker; chưa chạy → ChannelNotRunningError', async () => {
    const { adapter, transport, sink } = setup();
    await expect(adapter.send(ACC, { externalThreadId: 'u1', kind: 'text', text: 'x' })).rejects.toBeInstanceOf(ChannelNotRunningError);
    const { r } = await login(adapter);
    await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
    const s = transport.session(ACC)!;
    const res = await adapter.send(ACC, { externalThreadId: 'u1', kind: 'text', text: `${'a '.repeat(1100)}**chốt đơn**` });
    expect(s.sent.filter((x) => x.kind === 'text')).toHaveLength(2);
    expect(res.externalMsgId).toBe(s.sent[1]!.id);
    expect(s.sent[1]!.styles).toEqual([{ start: s.sent[1]!.msg.indexOf('chốt đơn'), len: 8, st: 'b' }]);
    await adapter.send(ACC, { externalThreadId: 'g1', isGroup: true, kind: 'file', text: 'Báo giá', attachments: [{ url: 'https://f/x', mime: 'application/pdf', name: 'bao-gia' }] });
    expect(s.sent.at(-1)).toMatchObject({ threadId: 'g1', isGroup: true, kind: 'files', files: ['bao-gia.pdf'] });
    await adapter.send(ACC, { externalThreadId: 'u1', kind: 'sticker', sticker: { id: 7, cateId: 1, type: 1 } });
    expect(s.sent.at(-1)).toMatchObject({ kind: 'sticker', msg: '7' });
  });

  it('bị đá phiên → status expired, phiên bỏ; lịch sử chỉ lấy tin trong N ngày (không qua sink tin mới); stop', async () => {
    const { adapter, transport, inbox, statuses, sink } = setup();
    const { r } = await login(adapter);
    await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
    const s = transport.session(ACC)!;
    const day = 86_400_000;
    s.history = [
      { isGroup: false, isSelf: false, threadId: 'u1', msgId: 'old', uidFrom: 'u1', ts: String(Date.now() - 40 * day), msgType: 'webchat', content: 'cũ' },
      { isGroup: false, isSelf: false, threadId: 'u1', msgId: 'new', uidFrom: 'u1', ts: String(Date.now() - 2 * day), msgType: 'webchat', content: 'mới' },
    ];
    const got: string[] = [];
    await adapter.fetchHistory(ACC, { cutoffAt: new Date(Date.now() - 30 * day).toISOString(), maxPages: 10, maxMessages: 500, pageTimeoutMs: 1000 }, async (b) => void got.push(...b.map((m) => m.externalMsgId)));
    expect(got).toEqual(['new']);
    expect(inbox).toEqual([]);

    s.kick();
    expect(statuses).toEqual(['expired']);
    expect(adapter.isRunning(ACC)).toBe(false);
    expect(await adapter.probe(ACC)).toBe('error');

    await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
    await adapter.stop(ACC);
    expect(transport.session(ACC)!.running).toBe(false);
  });
});
