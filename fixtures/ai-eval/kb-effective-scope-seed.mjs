// Seed suite `kb-effective-scope` (TIP-020c AC8): nguồn tri thức THẬT qua action (kb.folder.create / kb.add_source) mang MÃ canary ngẫu nhiên mỗi lượt chạy (model không thể đoán — mã ngoài phạm vi xuất hiện trong câu trả lời = rò):
//   fa  — thư mục FA, public          fb  — thư mục FB, public          tag — không thư mục, thẻ T, public
//   int — thẻ I, internal (tài liệu)  pub — thẻ I, public              out — không thư mục / thẻ, public
// Một agent fixture (tool kb.search), mỗi ca xuất bản phạm vi: empty (rỗng) · folder [FA] · tag [T] · mixed [FA] + [T] · internal [I]. Sales thật (không
// kb.manage — nguồn tài liệu nội bộ phải bị chặn). Nhãn gói theo mã lượt để kho fixture cũ không lẫn. Chỉ workspace fixture `[ai-live]`.
// Stack ai-live chưa có route embedding (seed `EMBED_SEED_*` thuộc TIP-020e) → nguồn thêm với `learn: false` rồi chèn MỘT đoạn mỗi nguồn
// (embed_model `none` — nhánh từ khoá trigram của cùng truy vấn production, như test ghép worker) và đặt chunk_count; `restore(k)` chèn lại
// sau khi ca thu hồi nạp lại nguồn (nạp lại thật: thế hệ đổi, đoạn cũ bị xoá).
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { seedChannelSales } from './channel-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

export function tenantUrl(ws) {
  const env = existsSync(join(ROOT, '.env')) ? readFileSync(join(ROOT, '.env'), 'utf8') : '';
  const base = process.env.TENANT_DATABASE_URL ?? /^TENANT_DATABASE_URL=(.*)$/m.exec(env)?.[1]?.trim();
  if (!base) throw new Error('thiếu TENANT_DATABASE_URL');
  const u = new URL(base);
  u.pathname = `/ws_${ws.replace(/-/g, '').slice(-12).toLowerCase()}`;
  return u.toString();
}

/** Một đoạn đã nạp cho nguồn: chờ lần nạp hiện hành xong (không còn pending / processing — ca nạp lại: job thất bại vì chưa có route
 *  embedding), rồi chèn đoạn + đặt `ready` / chưa học tự động (giữ nguyên thế hệ `ingest_seq` — thế hệ mới sau nạp lại). */
export async function chunkOf(ws, sourceId, text) {
  const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
  const db = new Client({ connectionString: tenantUrl(ws) });
  await db.connect();
  try {
    const end = Date.now() + 60_000;
    while (['pending', 'processing'].includes((await db.query(`SELECT status::text AS s FROM kb_source WHERE id = $1`, [sourceId])).rows[0]?.s)) {
      if (Date.now() > end) throw new Error(`nguồn ${sourceId} chưa nạp xong`);
      await sleep(500);
    }
    await db.query(`DELETE FROM kb_chunk WHERE source_id = $1`, [sourceId]);
    await db.query(`INSERT INTO kb_chunk (id, source_id, ord, content, embed_model) VALUES ($1, $2, 0, $3, 'none')`, [randomUUID(), sourceId, text]);
    await db.query(`UPDATE kb_source SET status = 'ready', learn = false, error = NULL, chunk_count = 1 WHERE id = $1`, [sourceId]);
  } finally {
    await db.end();
  }
}

const TAG = '[ai-live kbs]';
const AGENT = 'KBS phạm vi [ai-live]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

const code = (k) => `KB${k.toUpperCase()}-${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

/** Chờ mọi nguồn của lượt đã học (ingest xong) — đọc lại qua API quản lý kho thật. */
export async function waitLearned(c, stamp, n, ms = 180_000) {
  const end = Date.now() + ms;
  for (;;) {
    const rows = (await c.req('GET', `/settings/kb?q=${encodeURIComponent(stamp)}`)).body?.data?.data ?? [];
    if (rows.filter((r) => r.learned).length >= n) return;
    if (Date.now() > end) throw new Error(`nguồn chưa học xong: ${rows.filter((r) => r.learned).length}/${n}`);
    await sleep(2000);
  }
}

async function createOr(c, prompt, scope) {
  const r = await c.req('POST', '/actions/agent.create_and_publish', { input: { name: AGENT, role: 'custom', tools: ['kb.search'], threshold: 60, prompt, kb_scope: scope } }, { 'idempotency-key': randomUUID() });
  if (r.status === 402) return null;
  if (r.status >= 300) throw new Error(`agent.create_and_publish → ${r.status}`);
  return r.body.data.result.agent_id;
}

export async function seedKbScope(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const stamp = Date.now().toString(36).slice(-6).toUpperCase();
  const keys = ['fa', 'fb', 'tag', 'int', 'pub', 'out'];
  const codes = Object.fromEntries(keys.map((k) => [k, code(k)]));
  const WORD = { fa: 'Hoa Sen', fb: 'Tre Xanh', tag: 'Mai Vàng', int: 'Ngọc Trai', pub: 'Bạch Dương', out: 'Lan Rừng' };
  const labels = Object.fromEntries(keys.map((k) => [k, `${WORD[k]} ${stamp}`]));
  const tagT = `kbs-faq-${stamp.toLowerCase()}`;
  const tagI = `kbs-noibo-${stamp.toLowerCase()}`;
  const fa = (await act(c, 'kb.folder.create', { name: `FA ${stamp} ${TAG}`.slice(0, 60), visibility: 'public' })).folder_id;
  const fb = (await act(c, 'kb.folder.create', { name: `FB ${stamp} ${TAG}`.slice(0, 60), visibility: 'public' })).folder_id;
  const place = { fa: { folder_id: fa }, fb: { folder_id: fb }, tag: { tags: [tagT] }, int: { tags: [tagI] }, pub: { tags: [tagI] }, out: {} };
  const vis = { int: 'internal' };
  const sources = {};
  const texts = {};
  for (const k of keys) {
    texts[k] = `Gói ${labels[k]}: mã quy trình dịch vụ của gói ${labels[k]} là ${codes[k]}. Kỹ thuật viên ghi mã này vào phiếu khi làm gói ${labels[k]}.`;
    sources[k] = (await act(c, 'kb.add_source', { name: `${TAG} ${k} ${stamp}`, text: texts[k], visibility: vis[k] ?? 'public', learn: false, ...place[k] })).source_id;
  }
  const ws = c.s.ws;
  const restore = (k) => chunkOf(ws, sources[k], texts[k]);
  for (const k of keys) await restore(k);
  await waitLearned(c, stamp, keys.length);
  // Gói trial giới hạn số agent → MỘT agent fixture; mỗi ca xuất bản phạm vi của ca (agent.update + agent.publish — phạm vi hiện hành
  // là bản đã xuất bản). Agent cũ của suite (lượt trước) dùng lại theo tên; workspace chưa có → tạo.
  const scopes = { empty: { folder_ids: [], tags: [] }, folder: { folder_ids: [fa], tags: [] }, tag: { folder_ids: [], tags: [tagT] }, mixed: { folder_ids: [fa], tags: [tagT] }, internal: { folder_ids: [], tags: [tagI] } };
  const prompt = 'Bạn là trợ lý tra cứu kho tri thức của spa. Luôn dùng công cụ kb.search để tra trước khi trả lời. Chỉ nêu mã quy trình có trong kết quả tra cứu; không có thì nói không tìm thấy, không bịa mã.';
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  // Hết hạn mức agent của gói (suite khác đã tạo) → mượn agent fixture có sẵn; cấu hình của nó do suite gốc tự đặt lại khi chạy.
  const agentId = list.find((a) => a.name === AGENT)?.id ?? (await createOr(c, prompt, scopes.empty)) ?? list[0]?.id;
  if (!agentId) throw new Error('không có agent fixture');
  const useScope = async (k) => {
    await act(c, 'agent.update', { agent_id: agentId, patch: { tools: ['kb.search'], prompt, kb_scope: scopes[k] } });
    await act(c, 'agent.publish', { agent_id: agentId });
  };
  const agents = Object.fromEntries(Object.keys(scopes).map((k) => [k, agentId]));
  return { ...base, kbScope: { stamp, codes, labels, sources, agents, sales, sourceCount: keys.length, restore, useScope } };
}
