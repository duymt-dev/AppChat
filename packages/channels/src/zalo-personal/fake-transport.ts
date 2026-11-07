// Transport giả Zalo cá nhân (Q-003 — chưa có tài khoản Zalo phụ): QR giả tự "quét" sau `scanAfterMs` (hoặc chờ `scan()`),
// phiên giả ghi tin đã gửi, bơm tin vào / đá phiên / làm lỗi gửi để test. Chỉ bật bằng ZALO_TRANSPORT=fake (cấm production).
import { ChannelOperationError } from '../operations';
import { ChannelAuthError, type LoginEvent } from '../types';
import { ZALO_CLOSE, type ZaloCredentials, type ZaloRawFriendEvent, type ZaloGroupInfo, type ZaloProfile, type ZaloRawMessage, type ZaloRawReaction, type ZaloRawReceipt, type ZaloRawUndo, type ZaloSession, type ZaloStyle, type ZaloTransport } from './transport';

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
  op: 'undo' | 'react' | 'add_members' | 'profiles' | 'friends' | 'friend_accept' | 'friend_reject' | 'friend_send' | 'friend_undo' | 'find_user' | 'group_name' | 'group_link' | 'group_mute';
  userId?: string;
  text?: string;
  threadId: string;
  isGroup: boolean;
  msgId?: string;
  cliMsgId?: string;
  icon?: string;
  members?: string[];
}

/** Đếm id giả toàn tiến trình — phiên mới (kết nối lại) không sinh lại id đã dùng. */
let SEQ = 0;
/** Số 0..999.999.999 suy từ chuỗi (FNV-1a) — id giả ổn định, an toàn với kiểm `safeForSdk`. */
const stableDigits = (v: string) => {
  let h = 0x811c9dc5;
  for (const ch of v) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h % 1_000_000_000;
};

const uidOf = (hint: string) => `zl_${hint.replace(/-/g, '').slice(-12)}`;

export class FakeZaloSession implements ZaloSession {
  readonly sent: FakeSent[] = [];
  /** Số lần gửi tiếp theo sẽ lỗi (thử luật tự tạm dừng khi lỗi bất thường). */
  failNext = 0;
  /** Tin có đúng chữ này → lỗi mạng SAU khi gọi kênh (kết quả `unknown` — ai:live channel-vertical, `ZALO_FAKE_UNKNOWN_TEXT`). */
  unknownText: string | null = null;
  /** Tin có đúng chữ này → Zalo đá phiên (hết phiên, `expired` — ai:live channel-vertical, `ZALO_FAKE_KICK_TEXT`). */
  kickText: string | null = null;
  running = false;
  private msgCb: ((m: ZaloRawMessage) => void)[] = [];
  private oldCb: { isGroup: boolean; cb: (ms: ZaloRawMessage[]) => void }[] = [];
  private closeCb: ((code: number, reason: string) => void)[] = [];
  private selfCb: ((m: ZaloRawMessage) => void)[] = [];
  private undoCb: ((u: ZaloRawUndo) => void)[] = [];
  private reactCb: ((r: ZaloRawReaction) => void)[] = [];
  private receiptCb: ((r: ZaloRawReceipt) => void)[] = [];
  private friendCb: ((e: ZaloRawFriendEvent) => void)[] = [];
  /** Người tra được theo SĐT (findUser) + quan hệ hiện tại theo uid. */
  readonly phoneBook = new Map<string, { id: string; displayName: string; avatar?: string }>();
  readonly relations = new Map<string, { isFriend: boolean; requested: boolean; requesting: boolean }>();
  /** Lệnh bạn bè kế tiếp bị nhà cung cấp từ chối (riêng với `opMode` — job ảnh / danh bạ không tiêu mất). */
  friendMode: 'ok' | 'reject' = 'ok';
  private friendOp(o: FakeOp, ok: () => void): Promise<void> {
    const mode = this.friendMode;
    this.friendMode = 'ok';
    this.ops.push(o);
    if (mode === 'reject') return Promise.reject(new ChannelOperationError('rejected', 'fake'));
    ok();
    return Promise.resolve();
  }
  /** Lệnh thao tác đã gọi. */
  readonly ops: FakeOp[] = [];
  /** Lệnh thao tác kế tiếp: `reject` (nhà cung cấp trả lỗi rõ) / `hang` (treo — kiểm unknown) / `fail` (lỗi mạng). */
  opMode: 'ok' | 'reject' | 'hang' | 'fail' = 'ok';
  /** Tin tự gửi phát lại qua self-listen (mang cliMsgId) — như zca-js `selfListen: true`. Tắt để thử tin cũ thiếu cliMsgId. */
  selfEcho = true;
  /** Nhóm phía kênh cho groupInfo / groupLink. */
  readonly remoteGroups = new Map<string, ZaloGroupInfo & { link: string | null; muted?: boolean }>();
  /** Tin cũ trả về khi `requestOldMessages` — theo trang `historyPage` tin, mới → cũ, lùi theo `lastId`. */
  history: ZaloRawMessage[] = [];
  historyPage = 50;
  /** Không trả trang (kiểm hết giờ). */
  historyHang = false;
  /** Số lần xin trang (kiểm có giới hạn). */
  historyRequests = 0;
  /** Hồ sơ công khai cho `userInfo` (ảnh đại diện — TIP-014b D) + số lần gọi / id đã hỏi (kiểm lô, trần). */
  readonly profiles = new Map<string, { displayName: string; avatar?: string }>();
  readonly profileCalls: string[][] = [];
  /** Danh bạ cho `friends` (TIP-014b D3) + các trang đã xin. */
  friendList: { id: string; displayName: string; phone?: string; avatar?: string }[] = [];
  readonly friendPages: number[] = [];
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
  onOldMessagesOnce(isGroup: boolean, cb: (ms: ZaloRawMessage[]) => void) {
    const e = { isGroup, cb };
    this.oldCb.push(e);
    return () => void this.oldCb.splice(this.oldCb.indexOf(e), 1);
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
  onReceipt(cb: (r: ZaloRawReceipt) => void) {
    this.receiptCb.push(cb);
  }
  onFriend(cb: (e: ZaloRawFriendEvent) => void) {
    this.friendCb.push(cb);
  }

  /** Sự kiện bạn bè từ kênh (lời mời tới…). */
  emitFriend(e: Partial<ZaloRawFriendEvent> & { type: ZaloRawFriendEvent['type']; userId: string }) {
    if (!this.running) return;
    for (const cb of this.friendCb) cb({ isSelf: false, ts: String(Date.now()), ...e });
  }

  private rel(id: string) {
    return this.relations.get(id) ?? { isFriend: false, requested: false, requesting: false };
  }
  async acceptFriend(userId: string) {
    await this.friendOp({ op: 'friend_accept', threadId: '', isGroup: false, userId }, () => void this.relations.set(userId, { isFriend: true, requested: false, requesting: false }));
  }
  async rejectFriend(userId: string) {
    await this.friendOp({ op: 'friend_reject', threadId: '', isGroup: false, userId }, () => void this.relations.set(userId, { ...this.rel(userId), requesting: false }));
  }
  async sendFriendRequest(userId: string, message: string) {
    await this.friendOp({ op: 'friend_send', threadId: '', isGroup: false, userId, text: message }, () => void this.relations.set(userId, { ...this.rel(userId), requested: true }));
  }
  async undoFriendRequest(userId: string) {
    await this.friendOp({ op: 'friend_undo', threadId: '', isGroup: false, userId }, () => void this.relations.set(userId, { ...this.rel(userId), requested: false }));
  }
  async friendStatus(userId: string) {
    return this.rel(userId);
  }
  async findUser(phone: string) {
    return this.op({ op: 'find_user', threadId: '', isGroup: false, text: phone }, () => this.phoneBook.get(phone) ?? null);
  }

  /** Biên nhận đã nhận / đã xem từ kênh. */
  emitReceipt(r: Partial<ZaloRawReceipt> & { kind: 'delivered' | 'seen'; msgIds: string[] }) {
    if (!this.running) return;
    for (const cb of this.receiptCb) cb({ isGroup: false, threadId: 'zl_khach', uids: ['zl_khach'], ts: String(Date.now()), ...r });
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
    // Id số ổn định theo tài khoản (lần chạy lại phiên trùng tin → pipeline bỏ) + cliMsgId như tin vào thật — thả cảm xúc được.
    const n = stableDigits(this.ownId);
    if (this.greeting) setTimeout(() => this.inject({ msgId: `${8_000_000_000 + n}`, cliMsgId: `${6_000_000_000 + n}`, uidFrom: 'zl_khach_e2e', dName: 'Khách E2E', text: this.greeting! }), 300);
  }
  stop() {
    this.running = false;
  }
  requestOldMessages(isGroup: boolean, lastId: string | null) {
    this.historyRequests++;
    if (this.historyHang) return;
    const all = this.history.filter((m) => m.isGroup === isGroup).sort((a, b) => Number(b.ts) - Number(a.ts));
    const from = lastId ? all.findIndex((m) => m.msgId === lastId) + 1 : 0;
    const page = from > 0 || !lastId ? all.slice(from, from + this.historyPage) : [];
    const subs = this.oldCb.filter((e) => e.isGroup === isGroup);
    this.oldCb = this.oldCb.filter((e) => e.isGroup !== isGroup);
    setTimeout(() => subs.forEach((e) => e.cb(page)), 0);
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
    if (this.unknownText && s.msg === this.unknownText) throw new Error('zalo_network_timeout');
    if (this.kickText && s.msg === this.kickText) {
      this.kick();
      throw new ChannelAuthError('zalo_kicked');
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
    return { groupId, name: g.name, totalMember: g.totalMember, memberIds: [...g.memberIds], creatorId: g.creatorId, adminIds: g.adminIds, version: g.version };
  }
  async groupMembers(memberIds: string[]) {
    return memberIds.map((id) => ({ id, displayName: `Thành viên ${id}` }));
  }
  async userInfo(ids: string[]) {
    this.profileCalls.push([...ids]);
    return this.op({ op: 'profiles', threadId: '', isGroup: false, members: ids }, () =>
      ids.flatMap((id) => {
        const p = this.profiles.get(id);
        return p ? [{ id, displayName: p.displayName, ...(p.avatar ? { avatar: p.avatar } : {}) }] : [];
      }),
    );
  }
  async friends(page: number, count: number) {
    this.friendPages.push(page);
    return this.op({ op: 'friends', threadId: '', isGroup: false }, () => this.friendList.slice((page - 1) * count, page * count));
  }
  async groupLink(groupId: string) {
    const g = this.remoteGroups.get(groupId);
    if (!g) throw new ChannelOperationError('forbidden', 'group_not_visible');
    return { enabled: !!g.link, link: g.link, expiresAt: null };
  }
  async addUserToGroup(groupId: string, memberIds: string[]) {
    return this.op({ op: 'add_members', threadId: groupId, isGroup: true, members: memberIds }, () => ({ failed: memberIds.filter((m) => m.startsWith('blocked')).map((id) => ({ id, error: 'blocked' })) }));
  }
  private group(groupId: string) {
    const g = this.remoteGroups.get(groupId);
    if (!g) throw new ChannelOperationError('forbidden', 'group_not_visible');
    return g;
  }
  async changeGroupName(groupId: string, name: string) {
    const g = this.group(groupId);
    await this.op({ op: 'group_name', threadId: groupId, isGroup: true, text: name }, () => {
      g.name = name;
      g.version = String(Number(g.version ?? 0) + 1);
    });
  }
  async setGroupLink(groupId: string, enabled: boolean) {
    const g = this.group(groupId);
    await this.op({ op: 'group_link', threadId: groupId, isGroup: true, text: String(enabled) }, () => {
      g.link = enabled ? `https://zalo.me/g/fake${groupId.length}` : null;
    });
  }
  async setGroupMute(groupId: string, muted: boolean) {
    const g = this.group(groupId);
    await this.op({ op: 'group_mute', threadId: groupId, isGroup: true, text: String(muted) }, () => {
      g.muted = muted;
    });
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
  /** Chữ tin gửi ra mà kênh giả coi như mất mạng sau khi gọi (`ZALO_FAKE_UNKNOWN_TEXT`) — null = tắt. */
  unknownText: string | null = null;
  /** Chữ tin gửi ra làm kênh giả đá phiên (`ZALO_FAKE_KICK_TEXT`) — null = tắt. */
  kickText: string | null = null;

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
    s.unknownText = this.unknownText;
    s.kickText = this.kickText;
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
    this.unknownText = null;
    this.kickText = null;
  }
}

/** Một bản dùng chung trong tiến trình (worker + test cùng process điều khiển được). */
export const fakeZaloTransport = new FakeZaloTransport();
