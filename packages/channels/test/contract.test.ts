// Contract test dùng chung cho mọi adapter có trong registry (omnichannel-adapter §Thêm kênh mới bước 5, TIP-045b annex E): mỗi kênh GA
// (zalo_personal / webchat / email trên transport giả) phải qua cùng bộ ca — manifest hợp lệ + rateLimit dùng được cho limiter của worker
// (perMinute > 0, jitter [min ≤ max], cap chủ động nếu proactive giới hạn), tin vào chuẩn hoá đúng hình dạng (channelAccountId, thread,
// externalMsgId ổn định cho chống trùng ở DB, kind thuộc tập, sentAt ISO), nhận lại cùng tin → cùng externalMsgId, gửi chữ trả id riêng
// mỗi lần, chữ vượt maxTextLength không làm hỏng gửi, probe trả trạng thái thuộc tập; kênh chưa chạy phiên từ chối gửi trước khi gọi
// nhà cung cấp. Kênh mới thêm vào registry mà chưa có driver ở đây → test đỏ (bắt buộc viết driver).
import { describe, expect, it, vi } from 'vitest';
import {
  EmailAdapter,
  FAKE_MAIL_HOST,
  FAKE_MAIL_PASSWORD,
  FakeMailboxTransport,
  FakeZaloTransport,
  WebchatAdapter,
  ZaloPersonalAdapter,
  buildChannelRegistry,
  type ChannelAdapter,
  type HealthStatus,
  type NormalizedInbound,
  type OutboundMessage,
} from '../src';

const HEALTH: HealthStatus[] = ['connected', 'degraded', 'error', 'expired'];
const KINDS = ['text', 'image', 'file', 'sticker', 'audio'];

interface Driver {
  adapter: ChannelAdapter;
  accountId: string;
  /** Chạy phiên tài khoản (đăng nhập giả nếu cần). */
  start(): Promise<void>;
  /** Khách gửi một tin chữ có mã `ref` → trả các tin adapter đã chuẩn hoá (undefined: kênh nhận tin ngoài adapter). */
  inbound?(ref: string, text: string): Promise<NormalizedInbound[]>;
  thread: Pick<OutboundMessage, 'externalThreadId' | 'externalThreadTo' | 'meta'>;
  sentCount(): number;
  /** Gửi khi chưa chạy phiên phải bị từ chối (kênh không giữ phiên: undefined). */
  refusesWhenStopped?: boolean;
}

const zalo = (): Driver => {
  const transport = new FakeZaloTransport(5);
  const adapter = new ZaloPersonalAdapter(transport, async (url) => Buffer.from(url));
  const accountId = '0190f000-0000-7000-8000-00000000c001';
  const got: NormalizedInbound[] = [];
  return {
    adapter,
    accountId,
    async start() {
      const r = await adapter.beginLogin(accountId, () => undefined, new AbortController().signal);
      await adapter.start({ id: accountId, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, { push: async (m) => void got.push(m) });
    },
    async inbound(ref, text) {
      const before = got.length;
      transport.session(accountId)!.inject({ msgId: ref, text });
      await vi.waitFor(() => expect(got.length).toBeGreaterThan(before));
      return got.slice(before);
    },
    thread: { externalThreadId: 'u1' },
    sentCount: () => transport.session(accountId)?.sent.length ?? 0,
    refusesWhenStopped: true,
  };
};

const email = (): Driver => {
  const t = new FakeMailboxTransport();
  const adapter = new EmailAdapter(t);
  const accountId = '0190f000-0000-7000-8000-00000000c002';
  const creds = { address: 'cskh@spa.vn', imap_host: FAKE_MAIL_HOST, imap_port: 993, password: FAKE_MAIL_PASSWORD, smtp_host: 'smtp.fake.test', smtp_port: 465 };
  let cursor: unknown = null;
  return {
    adapter,
    accountId,
    async start() {
      await adapter.start({ id: accountId, workspaceId: 'ws', type: 'email', credentials: creds, settings: { history_days: 7 } }, { push: async () => undefined });
    },
    async inbound(ref, text) {
      // Cùng `ref` → cùng Message-ID (thư gửi lại / đồng bộ lại).
      t.deliver('cskh@spa.vn', { messageId: `<${ref}@khach.vn>`, from: { address: 'lan@khach.vn', name: 'Lan' }, subject: 'Hỏi', text });
      const p = await adapter.poll!(accountId, cursor, new Date());
      cursor = p.cursor;
      return p.messages;
    },
    thread: { externalThreadId: '<t1@khach.vn>', externalThreadTo: 'lan@khach.vn', meta: { subject: 'Hỏi' } },
    sentCount: () => t.sent.length,
    refusesWhenStopped: true,
  };
};

const webchat = (): Driver => {
  const out: unknown[] = [];
  const adapter = new WebchatAdapter({ toVisitor: (_v, _e, d) => void out.push(d) });
  return { adapter, accountId: '0190f000-0000-7000-8000-00000000c003', start: async () => undefined, thread: { externalThreadId: 'visitor-1' }, sentCount: () => out.length };
};

const DRIVERS: Record<string, () => Driver> = { zalo_personal: zalo, email, webchat };

describe('registry: mọi kênh GA có driver contract', () => {
  it('không có adapter nào lọt khỏi bộ contract', () => {
    const reg = buildChannelRegistry({ zalo: new FakeZaloTransport(5), mail: new FakeMailboxTransport(), widget: { toVisitor: () => undefined } });
    const withAdapter = reg.entries.filter((e) => e.adapter).map((e) => e.manifest.type);
    expect(withAdapter.sort()).toEqual(Object.keys(DRIVERS).sort());
  });
});

describe.each(Object.keys(DRIVERS))('contract kênh %s', (type) => {
  it('manifest + rateLimit dùng được cho limiter', () => {
    const { manifest: m } = DRIVERS[type]!().adapter;
    expect(m.type).toBe(type);
    expect(m.status).toBe('ga');
    expect(m.capabilities.send).toContain('text');
    expect(m.capabilities.maxTextLength).toBeGreaterThan(0);
    expect(Number.isInteger(m.rateLimit.perMinute) && m.rateLimit.perMinute > 0).toBe(true);
    if (m.rateLimit.jitterMs) expect(m.rateLimit.jitterMs[0]).toBeLessThanOrEqual(m.rateLimit.jitterMs[1]);
    if (m.capabilities.proactive === 'allowed' && m.session === 'lease') expect(m.rateLimit.perDayProactive).toBeGreaterThan(0);
  });

  it('chuẩn hoá tin vào + id ổn định cho chống trùng', async () => {
    const d = DRIVERS[type]!();
    if (!d.inbound) return; // webchat: tin vào do API dựng NormalizedInbound (contract ở core widget gateway).
    await d.start();
    const [m] = await d.inbound('ref-1', 'Shop ơi còn lịch không?');
    expect(m).toBeDefined();
    expect(m!.channelAccountId).toBe(d.accountId);
    expect(m!.externalThreadId).toEqual(expect.any(String));
    expect(m!.externalMsgId.length).toBeGreaterThan(0);
    expect(KINDS).toContain(m!.kind);
    expect(new Date(m!.sentAt).toISOString()).toBe(m!.sentAt);
    expect(m!.text).toContain('còn lịch');
    expect(m!.sender.externalId.length).toBeGreaterThan(0);
    const again = await d.inbound('ref-1', 'Shop ơi còn lịch không?');
    if (again.length) expect(again[0]!.externalMsgId).toBe(m!.externalMsgId);
  });

  it('gửi chữ: id riêng mỗi lần, chữ dài vẫn gửi; probe thuộc tập trạng thái', async () => {
    const d = DRIVERS[type]!();
    if (d.refusesWhenStopped) {
      await expect(d.adapter.send(d.accountId, { ...d.thread, kind: 'text', text: 'x' })).rejects.toThrow();
      expect(d.sentCount()).toBe(0);
    }
    await d.start();
    const a = await d.adapter.send(d.accountId, { ...d.thread, kind: 'text', text: 'Dạ còn ạ' });
    const b = await d.adapter.send(d.accountId, { ...d.thread, kind: 'text', text: 'x'.repeat(d.adapter.manifest.capabilities.maxTextLength + 10) });
    expect(a.externalMsgId).not.toBe(b.externalMsgId);
    expect(d.sentCount()).toBeGreaterThanOrEqual(2);
    expect(HEALTH).toContain(await d.adapter.probe(d.accountId));
  });
});
