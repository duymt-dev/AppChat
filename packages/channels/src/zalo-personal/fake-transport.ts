// Transport giả Zalo cá nhân (Q-003 — chưa có tài khoản Zalo phụ): QR giả tự "quét" sau `scanAfterMs` (hoặc chờ `scan()`),
// phiên giả ghi tin đã gửi, bơm tin vào / đá phiên / làm lỗi gửi để test. Chỉ bật bằng ZALO_TRANSPORT=fake (cấm production).
import { ChannelAuthError, type LoginEvent } from '../types';
import { ZALO_CLOSE, type ZaloCredentials, type ZaloProfile, type ZaloRawMessage, type ZaloSession, type ZaloStyle, type ZaloTransport } from './transport';

/** PNG 1×1 — đủ để FE hiện ảnh `data:image/png;base64,…`. */
export const FAKE_QR_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export interface FakeSent {
  threadId: string;
  isGroup: boolean;
  kind: 'text' | 'files' | 'sticker';
  msg: string;
  styles?: ZaloStyle[];
  files?: string[];
  id: string;
}

const uidOf = (hint: string) => `zl_${hint.replace(/-/g, '').slice(-12)}`;

export class FakeZaloSession implements ZaloSession {
  readonly sent: FakeSent[] = [];
  /** Số lần gửi tiếp theo sẽ lỗi (thử luật tự tạm dừng khi lỗi bất thường). */
  failNext = 0;
  running = false;
  private seq = 0;
  private msgCb: ((m: ZaloRawMessage) => void)[] = [];
  private oldCb: ((ms: ZaloRawMessage[]) => void)[] = [];
  private closeCb: ((code: number, reason: string) => void)[] = [];
  /** Tin cũ trả về khi `requestOldMessages`. */
  history: ZaloRawMessage[] = [];

  constructor(readonly ownId: string) {}

  onMessage(cb: (m: ZaloRawMessage) => void) {
    this.msgCb.push(cb);
  }
  onOldMessages(cb: (ms: ZaloRawMessage[]) => void) {
    this.oldCb.push(cb);
  }
  onClosed(cb: (code: number, reason: string) => void) {
    this.closeCb.push(cb);
  }
  start() {
    this.running = true;
  }
  stop() {
    this.running = false;
  }
  requestOldMessages() {
    for (const cb of this.oldCb) cb(this.history);
  }

  /** Khách nhắn tới (chỉ khi phiên đang chạy — như listener thật). */
  inject(m: Partial<ZaloRawMessage> & { msgId: string; text?: string }) {
    if (!this.running) return;
    const full: ZaloRawMessage = { isGroup: false, isSelf: false, threadId: m.uidFrom ?? 'zl_khach', uidFrom: 'zl_khach', ts: String(Date.now()), msgType: 'webchat', content: m.text ?? '', ...m };
    for (const cb of this.msgCb) cb(full);
  }

  /** Zalo đá phiên (đăng nhập nơi khác / đăng xuất) → listener đóng với mã 3003. */
  kick() {
    this.running = false;
    for (const cb of this.closeCb) cb(ZALO_CLOSE.kick, 'kicked');
  }

  private record(s: Omit<FakeSent, 'id'>): string {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('zalo_send_failed');
    }
    const id = `${this.ownId}-m${++this.seq}`;
    this.sent.push({ ...s, id });
    return id;
  }

  async sendText(threadId: string, isGroup: boolean, msg: string, styles: ZaloStyle[]) {
    return this.record({ threadId, isGroup, kind: 'text', msg, styles });
  }
  async sendFiles(threadId: string, isGroup: boolean, text: string, files: { data: Buffer; filename: string }[]) {
    return this.record({ threadId, isGroup, kind: 'files', msg: text, files: files.map((f) => f.filename) });
  }
  async sendSticker(threadId: string, isGroup: boolean, sticker: { id: number }) {
    return this.record({ threadId, isGroup, kind: 'sticker', msg: String(sticker.id) });
  }
}

export class FakeZaloTransport implements ZaloTransport {
  /** Phiên theo uid Zalo (một tài khoản một phiên — phiên mới thay phiên cũ). */
  readonly sessions = new Map<string, FakeZaloSession>();
  /** uid đã bị thu hồi phiên → login bằng credential cũ báo ChannelAuthError. */
  readonly revoked = new Set<string>();
  private readonly pending = new Map<string, () => void>();
  /** false → chờ `scan(accountId)`; 'decline' → người dùng từ chối trên điện thoại. */
  autoScan: boolean | 'decline' = true;

  constructor(public scanAfterMs = 1_500) {}

  async loginQR(onEvent: (e: LoginEvent) => void, signal: AbortSignal, hint: string): Promise<{ credentials: ZaloCredentials; profile: ZaloProfile }> {
    onEvent({ type: 'qr', image: FAKE_QR_PNG, expiresAt: new Date(Date.now() + 100_000).toISOString() });
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error('aborted'));
      if (signal.aborted) return fail();
      signal.addEventListener('abort', fail, { once: true });
      const done = () => {
        signal.removeEventListener('abort', fail);
        this.pending.delete(hint);
        resolve();
      };
      this.pending.set(hint, done);
      if (this.autoScan === 'decline') {
        setTimeout(() => {
          onEvent({ type: 'declined' });
          fail();
        }, this.scanAfterMs);
      } else if (this.autoScan) setTimeout(done, this.scanAfterMs);
    });
    onEvent({ type: 'scanned', name: 'Zalo thử nghiệm' });
    const id = uidOf(hint);
    this.revoked.delete(id);
    return { credentials: { imei: id, cookie: [{ key: 'zpw_sek', value: `secret-${id}` }], userAgent: 'appchat-fake' }, profile: { id, name: 'Zalo thử nghiệm', phone: '0909 000 111' } };
  }

  /** Giả lập người dùng quét QR của tài khoản `accountId` (khi `autoScan = false`). */
  scan(accountId: string): boolean {
    const f = this.pending.get(accountId);
    f?.();
    return !!f;
  }

  async login(credentials: ZaloCredentials): Promise<ZaloSession> {
    if (!credentials?.imei || this.revoked.has(credentials.imei)) throw new ChannelAuthError('zalo_login_failed');
    const s = new FakeZaloSession(credentials.imei);
    this.sessions.set(credentials.imei, s);
    return s;
  }

  /** Phiên của tài khoản AppChat `accountId` (uid giả dựng từ id). */
  session(accountId: string): FakeZaloSession | undefined {
    return this.sessions.get(uidOf(accountId));
  }

  reset() {
    this.sessions.clear();
    this.revoked.clear();
    this.pending.clear();
    this.autoScan = true;
  }
}

/** Một bản dùng chung trong tiến trình (worker + test cùng process điều khiển được). */
export const fakeZaloTransport = new FakeZaloTransport();
