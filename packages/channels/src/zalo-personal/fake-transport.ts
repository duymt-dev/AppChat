// Transport giả Zalo cá nhân (Q-003 — chưa có tài khoản Zalo phụ): QR giả tự "quét" sau `scanAfterMs` (hoặc chờ `scan()`),
// phiên giả ghi tin đã gửi, bơm tin vào / đá phiên / làm lỗi gửi để test. Chỉ bật bằng ZALO_TRANSPORT=fake (cấm production).
import { ChannelOperationError } from '../operations';
import { ChannelAuthError, type LoginEvent } from '../types';
import { ZALO_CLOSE, type ZaloCredentials, type ZaloGroupInfo, type ZaloProfile, type ZaloRawMessage, type ZaloRawReaction, type ZaloRawUndo, type ZaloSession, type ZaloStyle, type ZaloTransport } from './transport';

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
  /** cliMsgId giả (chuỗi số) — phát qua self-listen nếu `selfEcho` bật. */
  cliMsgId: string;
}

/** Lệnh thao tác đã nhận (thu hồi / cảm xúc / thêm thành viên) — test đối chiếu tham số SDK. */
export interface FakeOp {
  op: 'undo' | 'react' | 'add_members';
  threadId: string;
  isGroup: boolean;
  msgId?: string;
  cliMsgId?: string;
  icon?: string;
  members?: string[];
}

/** Đếm id giả toàn tiến trình — phiên mới (kết nối lại) không sinh lại id đã dùng. */
let SEQ = 0;

const uidOf = (hint: string) => `zl_${hint.replace(/-/g, '').slice(-12)}`;

export class FakeZaloSession implements ZaloSession {
  readonly sent: FakeSent[] = [];
  /** Số lần gửi tiếp theo sẽ lỗi (thử luật tự tạm dừng khi lỗi bất thường). */
  failNext = 0;
  running = false;
  private msgCb: ((m: ZaloRawMessage) => void)[] = [];
  private oldCb: ((ms: ZaloRawMessage[]) => void)[] = [];
  private closeCb: ((code: number, reason: string) => void)[] = [];
  private selfCb: ((m: ZaloRawMessage) => void)[] = [];
  private undoCb: ((u: ZaloRawUndo) => void)[] = [];
  private reactCb: ((r: ZaloRawReaction) => void)[] = [];
  /** Lệnh thao tác đã gọi. */
  readonly ops: FakeOp[] = [];
  /** Lệnh thao tác kế tiếp: `reject` (nhà cung cấp trả lỗi rõ) / `hang` (treo — kiểm unknown) / `fail` (lỗi mạng). */
  opMode: 'ok' | 'reject' | 'hang' | 'fail' = 'ok';
  /** Tin tự gửi phát lại qua self-listen (mang cliMsgId) — như zca-js `selfListen: true`. Tắt để thử tin cũ thiếu cliMsgId. */
  selfEcho = true;
  /** Nhóm phía kênh cho groupInfo / groupLink. */
  readonly remoteGroups = new Map<string, ZaloGroupInfo & { link: string | null }>();
  /** Tin cũ trả về khi `requestOldMessages`. */
  history: ZaloRawMessage[] = [];
  /** Nhóm đã tạo (TIP-023b SPEC D). */
  readonly groups: { groupId: string; name: string; members: string[] }[] = [];
  /** Lần tạo nhóm kế tiếp: lỗi (`fail`) hoặc treo đến khi hết giờ (`hang` — kiểm trạng thái unknown). */
  groupMode: 'ok' | 'fail' | 'hang' = 'ok';

  constructor(
    readonly ownId: string,
    private readonly greeting: string | null = null,
  ) {}

  onMessage(cb: (m: ZaloRawMessage) => void) {
    this.msgCb.push(cb);
  }
  onOldMessages(cb: (ms: ZaloRawMessage[]) => void) {
    this.oldCb.push(cb);
  }
  onClosed(cb: (code: number, reason: string) => void) {
    this.closeCb.push(cb);
  }
  onSelfMessage(cb: (m: ZaloRawMessage) => void) {
    this.selfCb.push(cb);
  }
  onUndo(cb: (u: ZaloRawUndo) => void) {
    this.undoCb.push(cb);
  }
  onReaction(cb: (r: ZaloRawReaction) => void) {
    this.reactCb.push(cb);
  }

  /** Khách thu hồi / tài khoản thu hồi từ điện thoại (sự kiện `undo` của kênh). */
  emitUndo(u: Partial<ZaloRawUndo> & { msgId: string }) {
    if (!this.running) return;
    for (const cb of this.undoCb) cb({ isGroup: false, isSelf: false, threadId: 'zl_khach', uidFrom: 'zl_khach', ts: String(Date.now()), ...u });
  }

  /** Cảm xúc từ kênh (sự kiện `reaction`). */
  emitReaction(r: Partial<ZaloRawReaction> & { msgIds: string[]; icon: string }) {
    if (!this.running) return;
    for (const cb of this.reactCb) cb({ isGroup: false, isSelf: false, threadId: 'zl_khach', uidFrom: 'zl_khach', ts: String(Date.now()), ...r });
  }

  /** Phát lại self-event cho tin đã gửi (test điều khiển thứ tự event trước / sau ACK). */
  echo(id: string) {
    const s = this.sent.find((x) => x.id === id);
    if (!s) return;
    const m: ZaloRawMessage = { isGroup: s.isGroup, isSelf: true, threadId: s.threadId, msgId: s.id, cliMsgId: s.cliMsgId, uidFrom: this.ownId, ts: String(Date.now()), msgType: 'webchat', content: s.msg };
    for (const cb of this.selfCb) cb(m);
  }
  start() {
    this.running = true;
    // Tin chào giả (E2E http — worker chạy tiến trình riêng, test không bơm tin trực tiếp được).
    if (this.greeting) setTimeout(() => this.inject({ msgId: `greet-${this.ownId}`, uidFrom: 'zl_khach_e2e', dName: 'Khách E2E', text: this.greeting! }), 300);
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

  private record(s: Omit<FakeSent, 'id' | 'cliMsgId'>): string {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('zalo_send_failed');
    }
    // Id số như Zalo thật (chuỗi chữ số) để đi qua kiểm id an toàn của thao tác.
    const n = ++SEQ;
    const id = `${7_000_000_000 + n}`;
    this.sent.push({ ...s, id, cliMsgId: `${9_000_000_000 + n}` });
    if (this.selfEcho) queueMicrotask(() => this.echo(id));
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
  async createGroup(name: string, members: string[]) {
    const mode = this.groupMode;
    this.groupMode = 'ok';
    if (mode === 'hang') return new Promise<never>(() => undefined);
    if (mode === 'fail') throw new Error('zalo_group_failed');
    const groupId = `${this.ownId}-g${this.groups.length + 1}`;
    this.groups.push({ groupId, name, members });
    return { groupId, added: members.filter((m) => !m.startsWith('blocked')), failed: members.filter((m) => m.startsWith('blocked')) };
  }

  private async op<T>(o: FakeOp, ok: () => T): Promise<T> {
    const mode = this.opMode;
    this.opMode = 'ok';
    this.ops.push(o);
    if (mode === 'hang') return new Promise<never>(() => undefined);
    if (mode === 'reject') throw new ChannelOperationError('rejected', 'fake');
    if (mode === 'fail') throw new Error('zalo_network');
    return ok();
  }
  async undo(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string) {
    await this.op({ op: 'undo', threadId, isGroup, msgId, cliMsgId }, () => undefined);
  }
  async react(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string, icon: string) {
    await this.op({ op: 'react', threadId, isGroup, msgId, cliMsgId, icon }, () => undefined);
  }
  async groupInfo(groupId: string): Promise<ZaloGroupInfo> {
    const g = this.remoteGroups.get(groupId);
    if (!g) throw new ChannelOperationError('forbidden', 'group_not_visible');
    return { groupId, name: g.name, totalMember: g.totalMember, memberIds: [...g.memberIds] };
  }
  async groupMembers(memberIds: string[]) {
    return memberIds.map((id) => ({ id, displayName: `Thành viên ${id}` }));
  }
  async groupLink(groupId: string) {
    const g = this.remoteGroups.get(groupId);
    if (!g) throw new ChannelOperationError('forbidden', 'group_not_visible');
    return { enabled: !!g.link, link: g.link, expiresAt: null };
  }
  async addUserToGroup(groupId: string, memberIds: string[]) {
    return this.op({ op: 'add_members', threadId: groupId, isGroup: true, members: memberIds }, () => ({ failed: memberIds.filter((m) => m.startsWith('blocked')).map((id) => ({ id, error: 'blocked' })) }));
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
  /** Khách giả nhắn một tin khi phiên bắt đầu (`ZALO_FAKE_GREETING`) — null = tắt. */
  greeting: string | null = null;

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
    const s = new FakeZaloSession(credentials.imei, this.greeting);
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
    this.greeting = null;
  }
}

/** Một bản dùng chung trong tiến trình (worker + test cùng process điều khiển được). */
export const fakeZaloTransport = new FakeZaloTransport();
