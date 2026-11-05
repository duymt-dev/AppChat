// Transport thật qua zca-js 2.2.0 (MIT) — nơi DUY NHẤT import SDK Zalo (omnichannel-adapter §1). Tắt tự kiểm cập nhật + log
// của thư viện (log có thể chứa cookie). Chưa nghiệm thu với tài khoản Zalo thật (Q-003): viết theo type của gói.
// TIP-014b: bật `selfListen` — tin tự gửi mang `cliMsgId` (sendMessage chỉ trả msgId) → tách sang `onSelfMessage`, không vào pipeline
// tin khách. Lệnh thu hồi / cảm xúc / nhóm: lỗi `ZaloApiError` (nhà cung cấp trả lỗi rõ) → ChannelOperationError('rejected'); lỗi
// mạng giữ nguyên để core ghi `unknown`. Ma trận năng lực: provider-capabilities.md.
import { AvatarSize, CloseReason, LoginQRCallbackEventType, ThreadType, Zalo, ZaloApiError, type API, type Credentials, type Message, type Reactions, type Style } from 'zca-js';
import { ChannelOperationError } from '../operations';
import { ChannelAuthError, type LoginEvent } from '../types';
import { zaloId } from './provider-refs';
import type { ZaloCredentials, ZaloGroupInfo, ZaloProfile, ZaloRawMessage, ZaloRawReaction, ZaloRawReceipt, ZaloRawUndo, ZaloSession, ZaloStyle, ZaloTransport } from './transport';

/** zca-js hết hạn QR sau 100 giây (apis/loginQR.js). */
const QR_TTL_MS = 100_000;

const OPTIONS = { selfListen: true, checkUpdate: false, logging: false } as const;

const thread = (isGroup: boolean) => (isGroup ? ThreadType.Group : ThreadType.User);

const raw = (m: Message): ZaloRawMessage => ({
  isGroup: m.type === ThreadType.Group,
  isSelf: m.isSelf,
  threadId: m.threadId,
  msgId: String(m.data.msgId),
  ...(zaloId(m.data.cliMsgId) ? { cliMsgId: zaloId(m.data.cliMsgId)! } : {}),
  uidFrom: m.data.uidFrom,
  dName: m.data.dName,
  ts: String(m.data.ts),
  msgType: m.data.msgType,
  content: m.data.content,
  ...('mentions' in m.data && m.data.mentions ? { mentions: m.data.mentions.map((x) => ({ uid: x.uid })) } : {}),
});

const msgId = (r: { message: { msgId: number } | null; attachment?: { msgId: number }[] }): string =>
  String(r.message?.msgId ?? r.attachment?.at(-1)?.msgId ?? '');

class ZcaSession implements ZaloSession {
  readonly ownId: string;

  constructor(private readonly api: API) {
    this.ownId = api.getOwnId();
  }

  onMessage(cb: (m: ZaloRawMessage) => void): void {
    this.api.listener.on('message', (m) => !m.isSelf && cb(raw(m)));
  }

  onSelfMessage(cb: (m: ZaloRawMessage) => void): void {
    this.api.listener.on('message', (m) => m.isSelf && cb(raw(m)));
  }

  onUndo(cb: (u: ZaloRawUndo) => void): void {
    this.api.listener.on('undo', (u) => {
      // content.globalMsgId là số → chỉ nhận khi còn an toàn (không mất chính xác).
      const msgId = zaloId(u.data.content?.globalMsgId);
      if (msgId) cb({ isGroup: u.isGroup, isSelf: u.isSelf, threadId: u.threadId, uidFrom: u.data.uidFrom, msgId, ts: String(u.data.ts) });
    });
  }

  onReceipt(cb: (r: ZaloRawReceipt) => void): void {
    // delivered_messages: { msgId, seen, deliveredUids, seenUids, realMsgId, mSTs } (+ groupId với nhóm). Không có msgId an toàn → bỏ.
    this.api.listener.on('delivered_messages', (ds) => {
      for (const d of ds) {
        const msgId = zaloId(d.data.msgId);
        if (!msgId) continue;
        const group = d.type === ThreadType.Group;
        cb({ kind: 'delivered', isGroup: group, threadId: d.threadId, msgIds: [msgId], uids: group ? (d.data.deliveredUids ?? []) : [d.threadId], ts: String(d.data.mSTs ?? '') });
        if (d.data.seen && d.data.seenUids?.length) cb({ kind: 'seen', isGroup: group, threadId: d.threadId, msgIds: [msgId], uids: group ? d.data.seenUids : [d.threadId], ts: String(d.data.mSTs ?? '') });
      }
    });
    // seen_messages: 1-1 { idTo, msgId, realMsgId } · nhóm { msgId, groupId, seenUids }.
    this.api.listener.on('seen_messages', (ss) => {
      for (const s of ss) {
        const msgId = zaloId(s.data.msgId);
        if (!msgId) continue;
        const group = s.type === ThreadType.Group;
        const uids = group ? ((s.data as { seenUids?: string[] }).seenUids ?? []) : [s.threadId];
        cb({ kind: 'seen', isGroup: group, threadId: s.threadId, msgIds: [msgId], uids, ts: '' });
      }
    });
  }

  onReaction(cb: (r: ZaloRawReaction) => void): void {
    this.api.listener.on('reaction', (r) => {
      const msgIds = (r.data.content?.rMsg ?? []).map((x) => zaloId(x.gMsgID)).filter((x): x is string => !!x);
      if (msgIds.length) cb({ isGroup: r.isGroup, isSelf: r.isSelf, threadId: r.threadId, uidFrom: r.data.uidFrom, msgIds, icon: String(r.data.content?.rIcon ?? ''), ts: String(r.data.ts) });
    });
  }

  onOldMessagesOnce(isGroup: boolean, cb: (ms: ZaloRawMessage[]) => void): () => void {
    const want = thread(isGroup);
    const on = (ms: Message[], type: ThreadType) => {
      if (type !== want) return;
      this.api.listener.off('old_messages', on);
      cb(ms.map(raw));
    };
    this.api.listener.on('old_messages', on);
    return () => void this.api.listener.off('old_messages', on);
  }

  onClosed(cb: (code: number, reason: string) => void): void {
    this.api.listener.on('closed', (code, reason) => cb(code, reason));
  }

  start(): void {
    this.api.listener.start({ retryOnClose: true });
  }

  stop(): void {
    this.api.listener.stop();
  }

  requestOldMessages(isGroup: boolean, lastId: string | null): void {
    this.api.listener.requestOldMessages(thread(isGroup), lastId);
  }

  async sendText(threadId: string, isGroup: boolean, msg: string, styles: ZaloStyle[]): Promise<string> {
    return msgId(await rejected(() => this.api.sendMessage({ msg, styles: styles as unknown as Style[] }, threadId, thread(isGroup))));
  }

  async sendFiles(threadId: string, isGroup: boolean, text: string, files: { data: Buffer; filename: string }[]): Promise<string> {
    const attachments = files.map((f) => ({ data: f.data, filename: f.filename as `${string}.${string}`, metadata: { totalSize: f.data.length } }));
    return msgId(await rejected(() => this.api.sendMessage({ msg: text, attachments }, threadId, thread(isGroup))));
  }

  async sendSticker(threadId: string, isGroup: boolean, sticker: { id: number; cateId: number; type: number }): Promise<string> {
    return String((await rejected(() => this.api.sendSticker(sticker, threadId, thread(isGroup)))).msgId);
  }

  async createGroup(name: string, members: string[]): Promise<{ groupId: string; added: string[]; failed: string[] }> {
    const r = await this.api.createGroup({ name, members });
    if (!r.groupId) throw new Error('zalo_group_no_id');
    return { groupId: String(r.groupId), added: r.sucessMembers ?? [], failed: r.errorMembers ?? [] };
  }

  async undo(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string): Promise<void> {
    await rejected(() => this.api.undo({ msgId, cliMsgId }, threadId, thread(isGroup)));
  }

  async react(threadId: string, isGroup: boolean, msgId: string, cliMsgId: string, icon: string): Promise<void> {
    await rejected(() => this.api.addReaction(icon as Reactions, { data: { msgId, cliMsgId }, threadId, type: thread(isGroup) }));
  }

  async groupInfo(groupId: string): Promise<ZaloGroupInfo> {
    const r = await rejected(() => this.api.getGroupInfo(groupId));
    const g = r.gridInfoMap?.[groupId];
    if (!g) throw new ChannelOperationError('forbidden', 'group_not_visible');
    return { groupId, name: g.name, totalMember: Number.isInteger(g.totalMember) ? g.totalMember : null, memberIds: g.memberIds ?? [] };
  }

  async groupMembers(memberIds: string[]): Promise<{ id: string; displayName: string; avatar?: string }[]> {
    const r = await rejected(() => this.api.getGroupMembersInfo(memberIds));
    return Object.entries(r.profiles ?? {}).map(([id, p]) => ({ id, displayName: p.displayName || p.zaloName, ...(p.avatar ? { avatar: p.avatar } : {}) }));
  }

  async userInfo(ids: string[]): Promise<{ id: string; displayName: string; avatar?: string }[]> {
    const r = await rejected(() => this.api.getUserInfo(ids, AvatarSize.Small));
    // Khoá trả về có thể mang hậu tố phiên bản (`<uid>_0`) — lấy uid từ hồ sơ, rơi về phần trước `_`.
    return Object.entries(r.changed_profiles ?? {}).map(([k, p]) => ({ id: p.userId || k.split('_')[0]!, displayName: p.displayName || p.zaloName, ...(p.avatar ? { avatar: p.avatar } : {}) }));
  }

  async friends(page: number, count: number): Promise<{ id: string; displayName: string; phone?: string; avatar?: string }[]> {
    const r = await rejected(() => this.api.getAllFriends(count, page, AvatarSize.Small));
    return (r ?? []).map((u) => ({ id: u.userId, displayName: u.displayName || u.zaloName, ...(u.phoneNumber ? { phone: u.phoneNumber } : {}), ...(u.avatar ? { avatar: u.avatar } : {}) }));
  }

  async groupLink(groupId: string): Promise<{ enabled: boolean; link: string | null; expiresAt: number | null }> {
    const r = await rejected(() => this.api.getGroupLinkDetail(groupId));
    const enabled = r.enabled === 1;
    return { enabled, link: enabled && r.link ? r.link : null, expiresAt: enabled && r.expiration_date ? r.expiration_date : null };
  }

  async addUserToGroup(groupId: string, memberIds: string[]): Promise<{ failed: { id: string; error: string }[] }> {
    const r = await rejected(() => this.api.addUserToGroup(memberIds, groupId));
    const err = r.error_data ?? {};
    const codeOf = (id: string) => Object.entries(err).find(([, ids]) => ids.includes(id))?.[0] ?? 'failed';
    return { failed: (r.errorMembers ?? []).map((id) => ({ id, error: codeOf(id) })) };
  }
}

/** Lỗi nhà cung cấp trả rõ (ZaloApiError) = thất bại chắc chắn; lỗi khác (mạng / hết giờ) để nguyên → core ghi unknown. */
async function rejected<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ZaloApiError) throw new ChannelOperationError('rejected', err.code === null ? undefined : String(err.code));
    throw err;
  }
}

export class ZcaTransport implements ZaloTransport {
  async loginQR(onEvent: (e: LoginEvent) => void, signal: AbortSignal): Promise<{ credentials: ZaloCredentials; profile: ZaloProfile }> {
    let creds: ZaloCredentials | null = null;
    let abort: (() => unknown) | null = null;
    const onAbort = () => abort?.();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      const api = await new Zalo(OPTIONS).loginQR({}, (e) => {
        if (e.actions && 'abort' in e.actions) abort = e.actions.abort;
        if (signal.aborted) return void abort?.();
        switch (e.type) {
          case LoginQRCallbackEventType.QRCodeGenerated:
            return onEvent({ type: 'qr', image: e.data.image, expiresAt: new Date(Date.now() + QR_TTL_MS).toISOString() });
          case LoginQRCallbackEventType.QRCodeScanned:
            return onEvent({ type: 'scanned', name: e.data.display_name });
          case LoginQRCallbackEventType.QRCodeExpired:
            onEvent({ type: 'expired' });
            return e.actions.abort();
          case LoginQRCallbackEventType.QRCodeDeclined:
            onEvent({ type: 'declined' });
            return e.actions.abort();
          case LoginQRCallbackEventType.GotLoginInfo:
            creds = { cookie: e.data.cookie, imei: e.data.imei, userAgent: e.data.userAgent };
        }
      });
      if (!creds) throw new ChannelAuthError('zalo_no_credentials');
      const { profile } = await api.fetchAccountInfo();
      api.listener.stop();
      return { credentials: creds, profile: { id: profile.userId || api.getOwnId(), name: profile.displayName || profile.zaloName, phone: profile.phoneNumber || undefined } };
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }

  async login(credentials: ZaloCredentials): Promise<ZaloSession> {
    try {
      return new ZcaSession(await new Zalo(OPTIONS).login(credentials as Credentials));
    } catch {
      // Lỗi đăng nhập bằng cookie = phiên hết hạn / bị đăng xuất → quét QR lại (không trả chi tiết: có thể chứa cookie).
      throw new ChannelAuthError('zalo_login_failed');
    }
  }
}

export { CloseReason as ZcaCloseReason };
