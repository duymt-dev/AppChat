// Cấu hình LLM ở DB nền tảng (D33, Blueprint §5.1 LLM Router): `llm_provider` (key giải mã AES-256-GCM), `model_route`, `model_price`
// — đọc cache 60 giây; Quản trị nền tảng đổi → thế hệ `platform_config_revision.ai` tăng cùng transaction, mọi tiến trình thấy lệch
// trong ≤ 2 giây và nạp lại (DC-370; snapshot ghi thế hệ đọc TRƯỚC khi nạp — lần nạp dở không hồi sinh cấu hình cũ). Là nguồn cho
// LlmRouter (@appchat/ai) + credit / mức ở Cài đặt › Mô hình AI (đơn giá trừ credit: DbPriceBook của billing). Seed từ env khi provider chưa có (Q-001 — 9router nạp không sửa code).
import type { PlatformDb } from '@appchat/db';
import { MOCK_EMBED_MODEL, MOCK_MODEL, MOCK_PROVIDER, type AiTier, type ModelPurpose, type ProviderConfig, type RouteRow, type RouterConfigSource } from '@appchat/ai';
import { decryptSecret, encryptSecret } from '../../kernel/crypto';
import { uuidv7 } from '../../kernel/ids';
import type { ModelPrice } from '../../billing/public';
import type { AiEnv } from '../ai.env';
import { AI_CONFIG_SCOPE, RevisionWatch } from '../../platform/public';
import { providerRevision, routeRevision } from './config-revision';

const TTL_MS = 60_000;

interface Snapshot {
  at: number;
  gen: bigint;
  routes: RouteRow[];
  providers: Map<string, ProviderConfig>;
  prices: Map<string, ModelPrice & { tier: AiTier }>;
}

export class ProviderStore implements RouterConfigSource {
  private snap: Snapshot | null = null;
  private loading: Promise<Snapshot> | null = null;
  private readonly watch: RevisionWatch;

  constructor(
    private readonly platform: Pick<PlatformDb, 'llmProvider' | 'modelRoute' | 'modelPrice' | 'platformConfigRevision'>,
    private readonly key: Buffer,
    private readonly now: () => number = Date.now,
  ) {
    this.watch = new RevisionWatch(platform, AI_CONFIG_SCOPE, now);
  }

  invalidate(): void {
    this.snap = null;
  }

  private async load(): Promise<Snapshot> {
    if (this.snap && this.now() - this.snap.at < TTL_MS && !(await this.watch.stale(this.snap.gen))) return this.snap;
    this.loading ??= (async () => {
      const gen = await this.watch.begin();
      const [providers, routes, prices] = await Promise.all([
        // Chỉ provider `active` mà lần probe gần nhất không hỏng chat (agent-gateway §12, DC-371). Chưa probe (seed env lúc triển khai) vẫn
        // route; tools / json / embed theo `capabilities` mà probe đã ghi. `last_error IS NULL` phải tách riêng: NOT LIKE trên NULL là NULL.
        this.platform.llmProvider.findMany({ where: { status: 'active', OR: [{ lastError: null }, { NOT: { lastError: { startsWith: 'chat:' } } }] } }),
        this.platform.modelRoute.findMany(),
        this.platform.modelPrice.findMany({ where: { active: true } }),
      ]);
      const map = new Map<string, ProviderConfig>();
      for (const p of providers) {
        if (!p.apiKeyEnc) continue;
        let apiKey: string;
        try {
          apiKey = decryptSecret(p.apiKeyEnc, this.key);
        } catch {
          continue; // khoá hỏng / xoay khoá chưa xong — coi như thiếu key, router bỏ qua
        }
        let headers: Record<string, string> | null = null;
        try {
          headers = p.headersEnc ? (JSON.parse(decryptSecret(p.headersEnc, this.key)) as Record<string, string>) : null;
        } catch {
          continue; // header bí mật không giải được → không gọi provider thiếu xác thực
        }
        const configRevision = providerRevision(this.key, { key: p.key, kind: p.kind, baseUrl: p.baseUrl, capabilities: p.capabilities, status: p.status, version: p.version, apiKeyEnc: p.apiKeyEnc, headersEnc: p.headersEnc });
        map.set(p.key, { key: p.key, kind: p.kind, baseUrl: p.baseUrl, apiKey, headers, capabilities: (p.capabilities ?? {}) as ProviderConfig['capabilities'], configRevision });
      }
      const snap: Snapshot = {
        at: this.now(),
        gen,
        routes: routes.map((r) => ({ tier: r.tier, purpose: r.purpose, priority: r.priority, providerKey: r.providerKey, model: r.model, vision: (r.params as { vision?: unknown } | null)?.vision === true, configRevision: routeRevision(this.key, { id: r.id, model: r.model, params: r.params, priority: r.priority }) })),
        providers: map,
        prices: new Map(prices.map((x) => [`${x.providerKey}:${x.model}`, { per1kIn: Number(x.creditsPer1kIn), per1kOut: Number(x.creditsPer1kOut), tier: x.tier }])),
      };
      this.snap = snap;
      return snap;
    })().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  async routes(tier: AiTier, purpose: ModelPurpose): Promise<RouteRow[]> {
    return (await this.load()).routes.filter((r) => r.tier === tier && r.purpose === purpose);
  }

  async provider(key: string): Promise<ProviderConfig | null> {
    return (await this.load()).providers.get(key) ?? null;
  }

  async price(provider: string, model: string): Promise<ModelPrice | null> {
    const p = (await this.load()).prices.get(`${provider}:${model}`);
    return p ? { per1kIn: p.per1kIn, per1kOut: p.per1kOut } : null;
  }

  /** Credit / 1k token (vào + ra) rẻ nhất của từng mức — hiển thị ở Cài đặt › Mô hình AI. */
  async tierCredits(): Promise<Partial<Record<AiTier, number>>> {
    const out: Partial<Record<AiTier, number>> = {};
    for (const p of (await this.load()).prices.values()) {
      const c = p.per1kIn + p.per1kOut;
      if (out[p.tier] === undefined || c < out[p.tier]!) out[p.tier] = c;
    }
    return out;
  }

  /** Dòng trước TIP-040 có `headers` là object giá trị thô → mã hoá vào `headers_enc`, `headers` chỉ còn tên (DC-371). Idempotent. */
  async sealLegacyHeaders(): Promise<number> {
    const rows = await this.platform.llmProvider.findMany({ where: { headersEnc: null }, select: { key: true, headers: true, version: true } });
    let n = 0;
    for (const r of rows) {
      const h = r.headers;
      if (!h || typeof h !== 'object' || Array.isArray(h)) continue;
      const vals = Object.fromEntries(Object.entries(h as Record<string, unknown>).map(([k, v]) => [k, String(v)]));
      const done = await this.platform.llmProvider.updateMany({ where: { key: r.key, version: r.version, headersEnc: null }, data: { headersEnc: new Uint8Array(encryptSecret(JSON.stringify(vals), this.key)), headers: Object.keys(vals).sort(), version: { increment: 1 } } });
      n += done.count;
    }
    if (n) this.invalidate();
    return n;
  }

  /** Đơn giá model giả (`AI_ENGINE=mock` — dev / E2E): chat 1 / 3, embed 0,1 credit / 1k token. Có rồi thì giữ. */
  async seedMockPrices(): Promise<void> {
    const rows = [
      { model: MOCK_MODEL, in: 1, out: 3 },
      { model: MOCK_EMBED_MODEL, in: 0.1, out: 0 },
    ];
    for (const r of rows)
      await this.platform.modelPrice.upsert({
        where: { providerKey_model: { providerKey: MOCK_PROVIDER, model: r.model } },
        create: { providerKey: MOCK_PROVIDER, model: r.model, tier: 'standard', creditsPer1kIn: r.in, creditsPer1kOut: r.out },
        update: {},
      });
    this.invalidate();
  }

  /** Seed provider + route ba mức + đơn giá từ env khi provider chưa có (không ghi đè cấu hình Quản trị nền tảng). */
  async seed(env: AiEnv): Promise<boolean> {
    const key = env.LLM_SEED_PROVIDER_KEY;
    if (!key || !env.LLM_SEED_API_KEY || !env.LLM_SEED_MODEL) return false;
    if (await this.platform.llmProvider.findUnique({ where: { key }, select: { key: true } })) return false;
    const model = env.LLM_SEED_MODEL;
    await this.platform.llmProvider.create({
      data: { key, kind: env.LLM_SEED_KIND, name: key, baseUrl: env.LLM_SEED_BASE_URL ?? null, apiKeyEnc: new Uint8Array(encryptSecret(env.LLM_SEED_API_KEY, this.key)), capabilities: { tools: true, json_schema: true, streaming: true } },
    });
    for (const tier of ['standard', 'advanced', 'max'] as const) {
      const taken = await this.platform.modelRoute.findFirst({ where: { tier, purpose: 'chat' }, orderBy: { priority: 'desc' }, select: { priority: true } });
      await this.platform.modelRoute.create({ data: { id: uuidv7(), tier, purpose: 'chat', priority: (taken?.priority ?? -1) + 1, providerKey: key, model } });
    }
    await this.platform.modelPrice.upsert({
      where: { providerKey_model: { providerKey: key, model } },
      create: { providerKey: key, model, tier: 'standard', creditsPer1kIn: env.LLM_SEED_CREDITS_PER_1K_IN, creditsPer1kOut: env.LLM_SEED_CREDITS_PER_1K_OUT },
      update: {},
    });
    this.invalidate();
    return true;
  }

  /**
   * Seed provider embed riêng từ env (TIP-020e §1.4, DC-305): provider + route `embed` (mức standard — embed không phân mức) + đơn giá,
   * CHỈ khi provider chưa có (không ghi đè cấu hình Quản trị nền tảng 040), độc lập với seed chat. Route thêm sau route embed đã có.
   */
  async seedEmbed(env: AiEnv): Promise<boolean> {
    const key = env.EMBED_SEED_PROVIDER_KEY;
    if (!key || !env.EMBED_SEED_API_KEY) return false;
    if (await this.platform.llmProvider.findUnique({ where: { key }, select: { key: true } })) return false;
    const model = env.EMBED_SEED_MODEL;
    await this.platform.llmProvider.create({
      data: { key, kind: env.EMBED_SEED_KIND, name: key, baseUrl: env.EMBED_SEED_BASE_URL ?? null, apiKeyEnc: new Uint8Array(encryptSecret(env.EMBED_SEED_API_KEY, this.key)), capabilities: { embeddings: true } },
    });
    const taken = await this.platform.modelRoute.findFirst({ where: { tier: 'standard', purpose: 'embed' }, orderBy: { priority: 'desc' }, select: { priority: true } });
    await this.platform.modelRoute.create({ data: { id: uuidv7(), tier: 'standard', purpose: 'embed', priority: (taken?.priority ?? -1) + 1, providerKey: key, model } });
    await this.platform.modelPrice.upsert({
      where: { providerKey_model: { providerKey: key, model } },
      create: { providerKey: key, model, tier: 'standard', creditsPer1kIn: env.EMBED_SEED_CREDITS_PER_1K, creditsPer1kOut: 0 },
      update: {},
    });
    this.invalidate();
    return true;
  }
}
