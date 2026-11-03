// Transport thật qua zca-js 2.2.0 (MIT) — nơi DUY NHẤT import SDK Zalo (omnichannel-adapter §1). Tắt tự kiểm cập nhật + log
// của thư viện (log có thể chứa cookie). Chưa nghiệm thu với tài khoản Zalo thật (Q-003): viết theo type của gói.
import { CloseReason, LoginQRCallbackEventType, ThreadType, Zalo, type API, type Credentials, type Message, type Style } from 'zca-js';
import { ChannelAuthError, type LoginEvent } from '../types';
import type { ZaloCredentials, ZaloProfile, ZaloRawMessage, ZaloSession, ZaloStyle, ZaloTransport } from './transport';

/** zca-js hết hạn QR sau 100 giây (apis/loginQR.js). */
const QR_TTL_MS = 100_000;

const OPTIONS = { selfListen: false, checkUpdate: false, logging: false } as const;

const thread = (isGroup: boolean) => (isGroup ? ThreadType.Group : ThreadType.User);

const raw = (m: Message): ZaloRawMessage => ({
  isGroup: m.type === ThreadType.Group,
  isSelf: m.isSelf,
  threadId: m.threadId,
  msgId: String(m.data.msgId),
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
    this.api.listener.on('message', (m) => cb(raw(m)));
  }

  onOldMessages(cb: (ms: ZaloRawMessage[]) => void): void {
    this.api.listener.on('old_messages', (ms) => cb(ms.map(raw)));
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

  requestOldMessages(): void {
    this.api.listener.requestOldMessages(ThreadType.User);
    this.api.listener.requestOldMessages(ThreadType.Group);
  }

  async sendText(threadId: string, isGroup: boolean, msg: string, styles: ZaloStyle[]): Promise<string> {
    return msgId(await this.api.sendMessage({ msg, styles: styles as unknown as Style[] }, threadId, thread(isGroup)));
  }

  async sendFiles(threadId: string, isGroup: boolean, text: string, files: { data: Buffer; filename: string }[]): Promise<string> {
    const attachments = files.map((f) => ({ data: f.data, filename: f.filename as `${string}.${string}`, metadata: { totalSize: f.data.length } }));
    return msgId(await this.api.sendMessage({ msg: text, attachments }, threadId, thread(isGroup)));
  }

  async sendSticker(threadId: string, isGroup: boolean, sticker: { id: number; cateId: number; type: number }): Promise<string> {
    return String((await this.api.sendSticker(sticker, threadId, thread(isGroup))).msgId);
  }

  async createGroup(name: string, members: string[]): Promise<{ groupId: string; added: string[]; failed: string[] }> {
    const r = await this.api.createGroup({ name, members });
    if (!r.groupId) throw new Error('zalo_group_no_id');
    return { groupId: String(r.groupId), added: r.sucessMembers ?? [], failed: r.errorMembers ?? [] };
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
