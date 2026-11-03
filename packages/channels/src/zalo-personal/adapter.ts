// ChannelAdapter Zalo cá nhân (Blueprint §6, thiết kế theo OpenClaw `zalouser`): QR login → credential, giữ phiên (listener
// 1-1 + nhóm), gửi chữ (rich text, chia đoạn) / ảnh / file / sticker, probe, đồng bộ tin cũ, tạo nhóm (TIP-023b). Giới hạn tốc độ + lease ở worker.
import { ChannelAuthError, ChannelNotRunningError, type ChannelAccountRuntime, type ChannelAdapter, type CreateGroupRequest, type CreateGroupResult, type HealthStatus, type InboundSink, type LoginEvent, type LoginResult, type OutboundMessage } from '../types';
import { zaloPersonalManifest } from './manifest';
import { normalizeZalo } from './normalize';
import { renderChunks } from './render';
import { ZALO_CLOSE, type ZaloCredentials, type ZaloFile, type ZaloRawMessage, type ZaloSession, type ZaloTransport } from './transport';

/** Tải tệp đính kèm (URL đã ký của file store) thành Buffer để upload lên Zalo. */
export type FileFetcher = (url: string) => Promise<Buffer>;

const MAX_FILE = 25 * 1024 * 1024;

export const fetchFile: FileFetcher = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`attachment_http_${r.status}`);
  const len = Number(r.headers.get('content-length') ?? 0);
  if (len > MAX_FILE) throw new Error('attachment_too_large');
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_FILE) throw new Error('attachment_too_large');
  return buf;
};

interface Running {
  session: ZaloSession;
  sink: InboundSink;
  health: HealthStatus;
  /** Ngưỡng ngày của lần đồng bộ lịch sử đang chạy (null = không đồng bộ). */
  historySince: number | null;
}

const fileName = (name: string | undefined, mime: string, i: number): string => {
  if (name && /\.[a-z0-9]+$/i.test(name)) return name;
  const ext = mime.split('/')[1]?.split(/[;+]/)[0] || 'bin';
  return `${name || `tep-${i + 1}`}.${ext === 'jpeg' ? 'jpg' : ext}`;
};

export class ZaloPersonalAdapter implements ChannelAdapter {
  readonly manifest = zaloPersonalManifest;
  private readonly running = new Map<string, Running>();

  constructor(
    private readonly transport: ZaloTransport,
    private readonly files: FileFetcher = fetchFile,
  ) {}

  async beginLogin(accountId: string, onEvent: (e: LoginEvent) => void, signal: AbortSignal): Promise<LoginResult> {
    const { credentials, profile } = await this.transport.loginQR(onEvent, signal, accountId);
    return { credentials, externalId: profile.id, name: profile.phone ? `${profile.name} · ${profile.phone}` : profile.name };
  }

  async start(account: ChannelAccountRuntime, sink: InboundSink): Promise<void> {
    await this.stop(account.id);
    const session = await this.transport.login(account.credentials as ZaloCredentials);
    const run: Running = { session, sink, health: 'connected', historySince: null };
    const push = (m: ZaloRawMessage) => {
      const n = normalizeZalo(account.id, m, session.ownId);
      if (n) void sink.push(n).catch(() => undefined);
    };
    session.onMessage(push);
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

  async send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }> {
    const { session } = this.session(accountId);
    const group = !!msg.isGroup;
    const max = this.manifest.capabilities.maxTextLength;
    try {
      if (msg.kind === 'sticker') {
        const s = msg.sticker ?? {};
        return { externalMsgId: await session.sendSticker(msg.externalThreadId, group, { id: s.id ?? 0, cateId: s.cateId ?? 0, type: s.type ?? 1 }) };
      }
      if ((msg.kind === 'image' || msg.kind === 'file') && msg.attachments?.length) {
        const files: ZaloFile[] = [];
        for (const [i, a] of msg.attachments.entries()) files.push({ data: await this.files(a.url), filename: fileName(a.name, a.mime, i) });
        return { externalMsgId: await session.sendFiles(msg.externalThreadId, group, (msg.text ?? '').slice(0, max), files) };
      }
      let last = '';
      for (const part of renderChunks(msg.text ?? '', max)) last = await session.sendText(msg.externalThreadId, group, part.msg, part.styles);
      return { externalMsgId: last };
    } catch (err) {
      if (err instanceof ChannelAuthError) await this.stop(accountId);
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
