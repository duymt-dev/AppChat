// ChannelAdapter Zalo cá nhân (Blueprint §6, thiết kế theo OpenClaw `zalouser`): QR login → credential, giữ phiên (listener
// 1-1 + nhóm), gửi chữ (rich text, chia đoạn) / ảnh / file / sticker, probe, đồng bộ tin cũ, tạo nhóm (TIP-023b). Giới hạn tốc độ + lease ở worker.
// TIP-014b: thao tác thu hồi / cảm xúc / đọc nhóm qua `operations` (provider-operations.ts); sự kiện self-listen / thu hồi / cảm xúc từ
// kênh → `sink.event` (lỗi sink ghi lại, không nuốt im lặng); gửi trả tham chiếu từng phần (`parts`) theo thứ tự.
import { createHash } from 'node:crypto';
import type { ProviderEvent, ProviderMessageRef, SendLedger } from '../operations';
import { ChannelAuthError, ChannelNotRunningError, PartialSendError, type ChannelAccountRuntime, type ChannelAdapter, type CreateGroupRequest, type CreateGroupResult, type HealthStatus, type InboundSink, type LoginEvent, type LoginResult, type OutboundMessage, type SendReceipt } from '../types';
import { zaloPersonalManifest } from './manifest';
import { normalizeZalo } from './normalize';
import { reactionEvent, receiptEvent, selfRefEvent, undoEvent, zaloOperations } from './provider-operations';
import { renderChunks } from './render';
import { ZALO_CLOSE, type ZaloCredentials, type ZaloFile, type ZaloRawMessage, type ZaloSession, type ZaloTransport } from './transport';

/** Tải tệp đính kèm (URL đã ký của file store) thành Buffer để upload lên kênh. Core cấp bản an toàn (`attachmentFetcher` — đọc Storage
 *  cho link ký nội bộ, safeFetch cho URL ngoài); gói kênh không tự `fetch` URL (TIP-045b, chặn SSRF). */
export type FileFetcher = (url: string) => Promise<Buffer>;

/** Mặc định khi không được cấp FileFetcher: từ chối (fail closed) — không có đường tải URL tuỳ ý. */
export const refuseFileFetch: FileFetcher = async () => {
  throw new Error('attachment_fetcher_not_configured');
};

interface Running {
  session: ZaloSession;
  sink: InboundSink;
  health: HealthStatus;
  /** Ngưỡng ngày của lần đồng bộ lịch sử đang chạy (null = không đồng bộ). */
  historySince: number | null;
}

const partHash = (s: string) => createHash('sha256').update(s).digest('hex');

const fileName = (name: string | undefined, mime: string, i: number): string => {
  if (name && /\.[a-z0-9]+$/i.test(name)) return name;
  const ext = mime.split('/')[1]?.split(/[;+]/)[0] || 'bin';
  return `${name || `tep-${i + 1}`}.${ext === 'jpeg' ? 'jpg' : ext}`;
};

export class ZaloPersonalAdapter implements ChannelAdapter {
  readonly manifest = zaloPersonalManifest;
  private readonly running = new Map<string, Running>();
  readonly operations = zaloOperations((id) => this.session(id).session);
  /** Lỗi đẩy sự kiện vào sink (core) — đếm để probe / test thấy, không nuốt im lặng. */
  readonly sinkErrors = new Map<string, number>();

  constructor(
    private readonly transport: ZaloTransport,
    private readonly files: FileFetcher = refuseFileFetch,
  ) {}

  async beginLogin(accountId: string, onEvent: (e: LoginEvent) => void, signal: AbortSignal): Promise<LoginResult> {
    const { credentials, profile } = await this.transport.loginQR(onEvent, signal, accountId);
    return { credentials, externalId: profile.id, name: profile.phone ? `${profile.name} · ${profile.phone}` : profile.name };
  }

  async start(account: ChannelAccountRuntime, sink: InboundSink): Promise<void> {
    await this.stop(account.id);
    const session = await this.transport.login(account.credentials as ZaloCredentials);
    const run: Running = { session, sink, health: 'connected', historySince: null };
    const failed = () => this.sinkErrors.set(account.id, (this.sinkErrors.get(account.id) ?? 0) + 1);
    const push = (m: ZaloRawMessage) => {
      const n = normalizeZalo(account.id, m, session.ownId);
      if (n) void sink.push(n).catch(failed);
    };
    const emit = (e: ProviderEvent | null) => {
      if (e && sink.event) void sink.event(e).catch(failed);
    };
    session.onMessage(push);
    session.onSelfMessage((m) => emit(selfRefEvent(account.id, m)));
    session.onUndo((u) => emit(undoEvent(account.id, u)));
    session.onReaction((r) => emit(reactionEvent(account.id, r)));
    session.onReceipt((r) => emit(receiptEvent(account.id, r)));
    session.onOldMessages((ms) => {
      const since = run.historySince;
      if (since === null) return;
      for (const m of ms) if (Number(m.ts) >= since) push(m);
    });
    session.onClosed((code, reason) => {
      if (this.running.get(account.id) !== run) return;
      if (code === ZALO_CLOSE.manual) return;
      // Bị đá / mở phiên nơi khác → phải quét lại; lỗi mạng → zca-js tự thử lại, báo degraded.
      run.health = code === ZALO_CLOSE.kick || code === ZALO_CLOSE.duplicate ? 'expired' : 'degraded';
      sink.status?.(account.id, run.health, reason || String(code));
      if (run.health === 'expired') this.running.delete(account.id);
    });
    session.start();
    this.running.set(account.id, run);
  }

  async stop(accountId: string): Promise<void> {
    const r = this.running.get(accountId);
    if (!r) return;
    this.running.delete(accountId);
    r.session.stop();
  }

  isRunning(accountId: string): boolean {
    return this.running.has(accountId);
  }

  async probe(accountId: string): Promise<HealthStatus> {
    return this.running.get(accountId)?.health ?? 'error';
  }

  async syncHistory(accountId: string, days: number): Promise<void> {
    const r = this.session(accountId);
    r.historySince = days > 0 ? Date.now() - days * 86_400_000 : null;
    if (days > 0) r.session.requestOldMessages();
  }

  /**
   * Gửi theo từng phần (chữ chia đoạn = mỗi đoạn một phần; tệp / sticker = một phần). Có `ledger` (TIP-014b B): đặt chỗ bền trước mỗi lần
   * gọi kênh, ghi xác nhận ngay sau ACK — chạy lại sau sập bỏ qua phần đã xác nhận, không gửi lại.
   */
  async send(accountId: string, msg: OutboundMessage, ledger?: SendLedger): Promise<SendReceipt> {
    const { session } = this.session(accountId);
    const group = !!msg.isGroup;
    const max = this.manifest.capabilities.maxTextLength;
    // cliMsgId chưa biết lúc gửi (SDK chỉ trả msgId) — bổ sung khi self-event khớp đúng msgId (core).
    const ref = (msgId: string): ProviderMessageRef => ({ threadId: msg.externalThreadId, isGroup: group, msgId, cliMsgId: null, senderId: session.ownId });
    const parts: ProviderMessageRef[] = [];
    const done = (): SendReceipt => ({ externalMsgId: parts.at(-1)?.msgId ?? '', parts: [...parts] });
    const step = async (partNo: number, hash: string, call: () => Promise<string>) => {
      const r = ledger ? await ledger.reserve(partNo, hash) : 'send';
      if (r !== 'send') return void parts.push(r.skip);
      const p = ref(await call());
      parts.push(p);
      await ledger?.confirm(partNo, p);
    };
    try {
      if (msg.kind === 'sticker') {
        const s = msg.sticker ?? {};
        await step(0, partHash(`sticker:${s.id ?? 0}:${s.cateId ?? 0}`), () => session.sendSticker(msg.externalThreadId, group, { id: s.id ?? 0, cateId: s.cateId ?? 0, type: s.type ?? 1 }));
        return done();
      }
      if ((msg.kind === 'image' || msg.kind === 'file') && msg.attachments?.length) {
        const text = (msg.text ?? '').slice(0, max);
        // Tải tệp TRƯỚC khi đặt chỗ phần: lỗi tải = chưa gọi kênh → thử lại an toàn. Hash theo nội dung tệp (không theo link).
        const files: ZaloFile[] = [];
        for (const [i, a] of msg.attachments.entries()) files.push({ data: await this.files(a.url), filename: fileName(a.name, a.mime, i) });
        const digest = files.map((f) => createHash('sha256').update(f.data).digest('hex')).join('|');
        await step(0, partHash(`files:${text}:${digest}`), () => session.sendFiles(msg.externalThreadId, group, text, files));
        return done();
      }
      for (const [i, part] of renderChunks(msg.text ?? '', max).entries()) await step(i, partHash(`text:${part.msg}`), () => session.sendText(msg.externalThreadId, group, part.msg, part.styles));
      return done();
    } catch (err) {
      if (err instanceof ChannelAuthError) await this.stop(accountId);
      // Đã gửi được một phần (chia đoạn) rồi lỗi → trả phần đã có ACK, không để core gửi lại cả tin.
      if (parts.length) throw new PartialSendError(done(), err);
      throw err;
    }
  }

  /** Tạo nhóm từ uid đã biết. Không có phiên → ChannelNotRunningError trước khi gọi Zalo (thử lại an toàn). */
  async createGroup(accountId: string, req: CreateGroupRequest): Promise<CreateGroupResult> {
    const { session } = this.session(accountId);
    try {
      return await session.createGroup(req.name, req.members);
    } catch (err) {
      if (err instanceof ChannelAuthError) await this.stop(accountId);
      throw err;
    }
  }

  private session(accountId: string): Running {
    const r = this.running.get(accountId);
    if (!r) throw new ChannelNotRunningError(accountId);
    return r;
  }
}
