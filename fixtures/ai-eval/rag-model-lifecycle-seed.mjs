// Seed suite `rag-model-lifecycle` (TIP-020e AC9): embedding THẬT. Stack ai-live chạy trên DB nền tảng TEST (DC-358) và seed provider embed
// từ `EMBED_SEED_*` của `.env` (provider + route `embed` + đơn giá model S, chỉ khi provider chưa có). Seed này:
//   1. cấp quyền Quản trị nền tảng cho tài khoản fixture TRÊN DB TEST (`db:grant-platform-admin --test` — đường shell duy nhất, DC-368;
//      không bao giờ DB demo) để đổi route bằng action thật `admin.model_route.upsert` / giá `admin.model_price.upsert`;
//   2. thêm đơn giá model A (cùng provider, 1536 chiều — `RAG_LIFECYCLE_ALT_MODEL`, mặc định text-embedding-ada-002) để route A hợp lệ;
//   3. đưa route về [S], nạp 4 nguồn canary (mã ngẫu nhiên mỗi lượt) với `learn: true` → worker ai embed THẬT, chờ học xong.
// Nguồn của lượt trước (tên có TAG — chỉ do suite này tạo) bị quên trước khi nạp. Ca tự đổi route và dựng tiền điều kiện
// (rag-lifecycle-judge.ts). Chỉ workspace fixture `[ai-live]`.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { waitLearned } from './kb-effective-scope-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TAG = '[ai-live rml]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const envOf = () => {
  const f = join(ROOT, '.env');
  const file = existsSync(f) ? Object.fromEntries(readFileSync(f, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])) : {};
  return { ...file, ...process.env };
};

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body?.error ?? r.body).slice(0, 200)}`);
  return r.body.data.result;
}

const code = (i) => `RL${i}-${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

export async function seedRagLifecycle(c, base, o) {
  const env = envOf();
  const provider = env.EMBED_SEED_PROVIDER_KEY;
  const S = env.EMBED_SEED_MODEL || 'text-embedding-3-small';
  const A = env.RAG_LIFECYCLE_ALT_MODEL || 'text-embedding-ada-002';
  if (!provider || !env.EMBED_SEED_API_KEY) throw new Error('thiếu EMBED_SEED_PROVIDER_KEY / EMBED_SEED_API_KEY — chưa nghiệm thu với provider thật');
  // Quản trị nền tảng chỉ trên DB nền tảng TEST (cờ --test bắt buộc).
  if ((await c.req('GET', '/admin/session')).status !== 200) {
    const g = spawnSync('pnpm', ['--filter', '@appchat/db', 'db:grant-platform-admin', o.email, '--test'], { cwd: ROOT, shell: true, encoding: 'utf8' });
    if (g.status !== 0) throw new Error(`grant-platform-admin --test lỗi ${g.status}: ${`${g.stdout}
${g.stderr}`.trim().slice(-400)}`);
  }
  const admin = (await c.req('GET', '/admin/session')).status;
  if (admin !== 200) throw new Error(`/admin/session → ${admin}`);

  // Provider embed seed từ env (API boot) phải có; đơn giá A (giá như S — embed không phân mức).
  const prices = (await c.req('GET', '/admin/config/prices')).body?.data ?? [];
  const pS = prices.find((p) => p.provider_key === provider && p.model === S);
  if (!pS) throw new Error(`chưa có đơn giá ${provider}:${S} — API chưa seed EMBED_SEED_*`);
  if (!prices.some((p) => p.provider_key === provider && p.model === A && p.active))
    await act(c, 'admin.model_price.upsert', { provider_key: provider, model: A, tier: 'standard', credits_per_1k_in: pS.credits_per_1k_in, credits_per_1k_out: '0', active: true });

  const groups = (await c.req('GET', '/admin/config/routes')).body?.data ?? [];
  const eg = groups.find((x) => x.tier === 'standard' && x.purpose === 'embed');
  if (eg && eg.routes.map((r) => `${r.provider_key}:${r.model}`).join() !== `${provider}:${S}`)
    await act(c, 'admin.model_route.upsert', { tier: 'standard', purpose: 'embed', if_version: eg.version, routes: [{ provider_key: provider, model: S }] });
  await sleep(3000);

  // Nguồn canary của lượt trước (chỉ nguồn suite này tạo — tên có TAG) → quên: mã cũ không lẫn vào câu trả lời / bị chấm là bịa.
  for (let page = 0; page < 5; page++) {
    const rows = ((await c.req('GET', `/settings/kb?q=${encodeURIComponent(TAG)}`)).body?.data?.data ?? []).filter((r) => String(r.name).startsWith(TAG));
    if (!rows.length) break;
    for (const r of rows) await act(c, 'kb.remove_source', { source_id: r.id });
  }
  const stamp = Date.now().toString(36).slice(-6).toUpperCase();
  const WORD = { k1: 'Sen Trắng', k2: 'Trúc Đào', k3: 'Mẫu Đơn', k4: 'Thạch Thảo' };
  const TOPIC = { k1: 'mã phiếu bảo dưỡng', k2: 'mã quà tặng sinh nhật', k3: 'mã giữ chỗ cuối tuần', k4: 'mã đổi lịch hẹn' };
  const keys = ['k1', 'k2', 'k3', 'k4'];
  const codes = Object.fromEntries(keys.map((k, i) => [k, code(i + 1)]));
  const labels = Object.fromEntries(keys.map((k) => [k, `${WORD[k]} ${stamp}`]));
  for (const k of keys) {
    const text = `Gói ${labels[k]}\n\n${TOPIC[k]} của gói ${labels[k]} là ${codes[k]}. Lễ tân đọc mã này cho khách khi được hỏi về ${TOPIC[k]} gói ${labels[k]}.`;
    await act(c, 'kb.add_source', { name: `${TAG} ${k} ${stamp}`, text, visibility: 'public', learn: true });
  }
  await waitLearned(c, stamp, keys.length);
  return { ...base, ragLifecycle: { stamp, provider, models: { s: S, a: A }, codes, labels } };
}
