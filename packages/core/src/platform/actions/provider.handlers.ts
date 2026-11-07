// admin.llm_provider.upsert / probe / disable (TIP-040 pha 2b, DC-371). Key + giá trị header chỉ ghi (mã hoá AES-256-GCM, không bao
// giờ trả ra / vào audit / preview); vắng = giữ, null = xoá (xoá key → provider tắt). Đổi host base_url mà không nhập lại key → 422
// (key cũ không theo sang host mới). Kiểm URL (SSRF 045b + allowlist triển khai) + probe gọi ra ngoài chạy ở `prepare` — ngoài
// transaction; ghi CAS `if_version` + tăng thế hệ cấu hình `ai` cùng transaction → mọi tiến trình ngừng gọi provider đã tắt (≤ 2 giây).
// Lời gọi đã gửi tới provider trước khi tắt không huỷ được — chỉ lời gọi MỚI bị chặn.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { mergeCapabilities, probeProvider, type ProbeCheck, type ProbeRequest, type ProviderCapabilities } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminLlmProviderDisable, adminLlmProviderProbe, adminLlmProviderUpsert } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { decryptSecret, ENC_KEY, encryptSecret } from '../../kernel/crypto';
import { CLOCK, type Clock } from '../../kernel/clock';
import { AI_CONFIG_SCOPE, bumpRevision } from '../services/config-revision';
import { casConflict, requireVersion } from '../services/config-validation';
import { vetProviderUrl, type ProviderUrlPolicy } from '../services/provider-url';

export const PROVIDER_URL_POLICY = Symbol('PROVIDER_URL_POLICY');
/** Port probe (mặc định gọi thật qua AI SDK) — thay được trong test đơn vị. */
export const PROVIDER_PROBER = Symbol('PROVIDER_PROBER');
export type ProviderProber = (r: ProbeRequest) => Promise<ProbeCheck[]>;

type UpsertIn = ActionInput<typeof adminLlmProviderUpsert>;
type ProbeIn = ActionInput<typeof adminLlmProviderProbe>;
type DisableIn = ActionInput<typeof adminLlmProviderDisable>;
type Row = NonNullable<Awaited<ReturnType<PlatformDb['llmProvider']['findUnique']>>>;

/** Khoảng tối thiểu giữa hai lần probe một provider (chống bấm liên tục tốn tiền provider). */
const PROBE_GAP_MS = 10_000;

const view = (p: Pick<Row, 'kind' | 'name' | 'baseUrl' | 'status'> & { apiKeyEnc: unknown; headerNames: string[] }) => ({
  kind: p.kind,
  name: p.name,
  base_url: p.baseUrl,
  status: p.status,
  has_api_key: !!p.apiKeyEnc,
  header_names: p.headerNames,
});
const namesOf = (h: unknown) => (Array.isArray(h) ? (h as string[]) : h && typeof h === 'object' ? Object.keys(h).sort() : []);
const rowView = (r: Row) => view({ ...r, headerNames: namesOf(r.headers) });
const hostOf = (u: string | null | undefined) => (u ? new URL(u).host.toLowerCase() : null);

@Injectable()
@ActionHandler('admin.llm_provider.upsert')
export class AdminLlmProviderUpsertHandler extends PlatformActionHandler<UpsertIn, { key: string; version: number; created: boolean; status: 'active' | 'disabled' }> {
  constructor(
    @Optional() @Inject(ENC_KEY) private readonly encKey: Buffer | null,
    @Inject(PROVIDER_URL_POLICY) private readonly urls: ProviderUrlPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    super();
  }

  /** Kiểm URL (DNS — ngoài transaction). */
  override async prepare(_ctx: PlatformContext, i: UpsertIn): Promise<string | null | undefined> {
    if (!this.encKey) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'APP_ENC_KEY chưa cấu hình');
    if (i.kind === 'openai_compatible' && i.base_url === null) throw new AppError('VALIDATION_FAILED', 422, { base_url: 'required' });
    return i.base_url ? vetProviderUrl(i.base_url, this.urls) : i.base_url;
  }

  async executePlatform(_ctx: PlatformContext, i: UpsertIn, ptx: PlatformTx, prepared?: unknown): Promise<AdminOutcome<{ key: string; version: number; created: boolean; status: 'active' | 'disabled' }>> {
    const baseUrl = prepared as string | null | undefined;
    await bumpRevision(ptx, AI_CONFIG_SCOPE, this.clock.now());
    const cur = await ptx.llmProvider.findUnique({ where: { key: i.key } });
    const nextUrl = baseUrl === undefined ? (cur?.baseUrl ?? null) : baseUrl;
    if (i.kind === 'openai_compatible' && !nextUrl) throw new AppError('VALIDATION_FAILED', 422, { base_url: 'required' });
    if (cur && i.api_key === undefined && cur.apiKeyEnc && hostOf(nextUrl) !== hostOf(cur.baseUrl)) throw new AppError('VALIDATION_FAILED', 422, { api_key: 'required_on_host_change' });
    const secrets = {
      ...(i.api_key === undefined ? {} : { apiKeyEnc: i.api_key === null ? null : new Uint8Array(encryptSecret(i.api_key, this.encKey!)) }),
      ...(i.headers === undefined ? {} : i.headers === null ? { headersEnc: null, headers: [] } : { headersEnc: new Uint8Array(encryptSecret(JSON.stringify(i.headers), this.encKey!)), headers: Object.keys(i.headers).sort() }),
    };
    const base = { kind: i.kind, name: i.name, baseUrl: nextUrl };
    if (!cur) {
      if (i.if_version !== undefined) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
      const status = i.api_key ? 'active' : 'disabled';
      const row = await ptx.llmProvider.create({ data: { key: i.key, ...base, ...secrets, capabilities: {}, status } });
      return { result: { key: row.key, version: row.version, created: true, status: row.status }, after: rowView(row) };
    }
    requireVersion(i.if_version, cur.version);
    const keyless = i.api_key === null || (i.api_key === undefined && !cur.apiKeyEnc);
    const n = await ptx.llmProvider.updateMany({ where: { key: cur.key, version: cur.version }, data: { ...base, ...secrets, ...(keyless ? { status: 'disabled' as const } : {}), version: { increment: 1 } } });
    if (!n.count) throw casConflict(cur.version);
    const row = await ptx.llmProvider.findUniqueOrThrow({ where: { key: cur.key } });
    return { result: { key: row.key, version: row.version, created: false, status: row.status }, before: rowView(cur), after: rowView(row) };
  }

  async previewPlatform(_ctx: PlatformContext, i: UpsertIn, db: PlatformDb) {
    const cur = await db.llmProvider.findUnique({ where: { key: i.key } });
    const routes = cur ? await db.modelRoute.count({ where: { providerKey: i.key } }) : 0;
    const after = view({
      kind: i.kind,
      name: i.name,
      baseUrl: i.base_url === undefined ? (cur?.baseUrl ?? null) : i.base_url,
      status: i.api_key === null ? 'disabled' : (cur?.status ?? (i.api_key ? 'active' : 'disabled')),
      apiKeyEnc: i.api_key === undefined ? cur?.apiKeyEnc : i.api_key,
      headerNames: i.headers === undefined ? namesOf(cur?.headers) : Object.keys(i.headers ?? {}).sort(),
    });
    return {
      summary: `${i.key} · ${i.name}`,
      risk: 'config' as const,
      changes: [{ entity: 'llm_provider', id: i.key, ...(cur ? { before: rowView(cur) } : {}), after }],
      warnings: [...(i.api_key === null ? ['provider_disabled'] : []), ...(routes ? [`routes:${routes}`] : [])],
    };
  }
}

@Injectable()
@ActionHandler('admin.llm_provider.probe')
export class AdminLlmProviderProbeHandler extends PlatformActionHandler<ProbeIn, { key: string; version: number; checks: ProbeCheck[] }> {
  constructor(
    @Optional() @Inject(ENC_KEY) private readonly encKey: Buffer | null,
    @Inject(PROVIDER_URL_POLICY) private readonly urls: ProviderUrlPolicy,
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PROVIDER_PROBER) private readonly prober: ProviderProber | null = null,
  ) {
    super();
  }

  /** Đọc + kiểm phiên bản / URL rồi gọi provider thật (ngoài transaction, có hạn thời gian); key giải mã chỉ ở server. */
  override async prepare(_ctx: PlatformContext, i: ProbeIn, db: PlatformDb): Promise<ProbeCheck[]> {
    if (!this.encKey) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'APP_ENC_KEY chưa cấu hình');
    const p = await db.llmProvider.findUnique({ where: { key: i.key } });
    if (!p) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
    requireVersion(i.if_version, p.version);
    if (!p.apiKeyEnc) throw new AppError('VALIDATION_FAILED', 422, { api_key: 'missing' });
    if (p.lastProbeAt && this.clock.now().getTime() - p.lastProbeAt.getTime() < PROBE_GAP_MS) throw new AppError('RATE_LIMITED', 429, { key: 'probe_too_soon' });
    if (p.baseUrl) await vetProviderUrl(p.baseUrl, this.urls);
    const headers = p.headersEnc ? (JSON.parse(decryptSecret(p.headersEnc, this.encKey)) as Record<string, string>) : null;
    const provider = { key: p.key, kind: p.kind, baseUrl: p.baseUrl, apiKey: decryptSecret(p.apiKeyEnc, this.encKey), headers, capabilities: (p.capabilities ?? {}) as ProviderCapabilities };
    return (this.prober ?? probeProvider)({ provider, chatModel: i.chat_model, embedModel: i.embed_model ?? null, capabilities: [...new Set(i.capabilities)] });
  }

  async executePlatform(_ctx: PlatformContext, i: ProbeIn, ptx: PlatformTx, prepared?: unknown): Promise<AdminOutcome<{ key: string; version: number; checks: ProbeCheck[] }>> {
    const checks = prepared as ProbeCheck[];
    const now = this.clock.now();
    await bumpRevision(ptx, AI_CONFIG_SCOPE, now);
    const cur = await ptx.llmProvider.findUnique({ where: { key: i.key } });
    if (!cur) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
    requireVersion(i.if_version, cur.version);
    const caps = mergeCapabilities((cur.capabilities ?? {}) as ProviderCapabilities, checks);
    const failed = checks.find((c) => !c.ok);
    const n = await ptx.llmProvider.updateMany({
      where: { key: cur.key, version: cur.version },
      data: { capabilities: caps as object, lastProbeAt: now, lastError: failed ? `${failed.capability}:${failed.error ?? 'failed'}` : null, version: { increment: 1 } },
    });
    if (!n.count) throw casConflict(cur.version);
    return {
      result: { key: cur.key, version: cur.version + 1, checks },
      before: { capabilities: cur.capabilities },
      after: { capabilities: caps, checks: checks.map((c) => ({ capability: c.capability, ok: c.ok, error: c.error ?? null })) },
    };
  }

  async previewPlatform(_ctx: PlatformContext, i: ProbeIn, db: PlatformDb) {
    const p = await db.llmProvider.findUnique({ where: { key: i.key }, select: { key: true, name: true } });
    if (!p) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
    return { summary: `${p.key} · ${i.capabilities.join(', ')}`, risk: 'config' as const, warnings: ['external_call'] };
  }
}

@Injectable()
@ActionHandler('admin.llm_provider.disable')
export class AdminLlmProviderDisableHandler extends PlatformActionHandler<DisableIn, { key: string; version: number; status: 'active' | 'disabled' }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  async executePlatform(_ctx: PlatformContext, i: DisableIn, ptx: PlatformTx): Promise<AdminOutcome<{ key: string; version: number; status: 'active' | 'disabled' }>> {
    await bumpRevision(ptx, AI_CONFIG_SCOPE, this.clock.now());
    const cur = await ptx.llmProvider.findUnique({ where: { key: i.key } });
    if (!cur) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
    requireVersion(i.if_version, cur.version);
    if (i.status === 'active' && !cur.apiKeyEnc) throw new AppError('VALIDATION_FAILED', 422, { api_key: 'missing' });
    const n = await ptx.llmProvider.updateMany({ where: { key: cur.key, version: cur.version }, data: { status: i.status, version: { increment: 1 } } });
    if (!n.count) throw casConflict(cur.version);
    return { result: { key: cur.key, version: cur.version + 1, status: i.status }, before: { status: cur.status }, after: { status: i.status } };
  }

  async previewPlatform(_ctx: PlatformContext, i: DisableIn, db: PlatformDb) {
    const cur = await db.llmProvider.findUnique({ where: { key: i.key } });
    if (!cur) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
    const routes = await db.modelRoute.count({ where: { providerKey: i.key } });
    return {
      summary: `${i.key} → ${i.status}`,
      risk: 'config' as const,
      changes: [{ entity: 'llm_provider', id: i.key, before: { status: cur.status }, after: { status: i.status } }],
      warnings: i.status === 'disabled' && routes ? [`routes:${routes}`, 'inflight_not_cancelled'] : [],
    };
  }
}
