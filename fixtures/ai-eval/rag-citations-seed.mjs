// Seed suite `rag-citations` (TIP-020d AC8): nguồn THẬT qua action (kb.add_source) mang MÃ canary ngẫu nhiên mỗi lượt + TÊN TỆP canary
// (`noi-bo/<mã tệp>.pdf` — tên tệp không bao giờ được lọt vào câu gửi khách). Một agent fixture (tool kb.search, phạm vi thẻ lượt) trực
// widget webchat của workspace fixture; mỗi ca = một KHÁCH widget mới (socket `/widget` thật) nhắn → worker ROLE=ai chạy lượt agent thật
// (reply.service, model thật) → người chấm đọc binding trích dẫn của run (GET /runs/:id) + tin đã gửi / nháp / gợi ý.
//   gio  — "Gói <nhãn>: mã giờ mở cửa ..." (FAQ)          gia — "Gói <nhãn>: mã bảng giá ..." (FAQ)          bh — "... mã bảo hành ..." (FAQ)
//   noibo — thẻ khác (ngoài phạm vi agent) — không được trích / lộ.
// Stack ai-live chưa có route embedding (TIP-020e) → nguồn `learn: false` + chèn MỘT đoạn mỗi nguồn (nhánh từ khoá, như suite 020c).
import { randomUUID } from 'node:crypto';
import { chunkOf, waitLearned } from './kb-effective-scope-seed.mjs';

const TAG = '[ai-live cite]';
const AGENT = 'CITE lễ tân [ai-live]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

const code = (k) => `CT${k.toUpperCase()}-${randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()}`;

/** Một khách widget mới nhắn `text` → id hội thoại phía shop (khách mới = hội thoại mới, không lẫn lượt trước). */
async function visitor(c, api, io, key, name, text) {
  const origin = new URL(api).origin;
  const s = io(`${origin}/widget`, { auth: { public_key: key }, extraHeaders: { origin }, transports: ['websocket'], reconnection: false });
  const call = (ev, p) => new Promise((ok, no) => s.timeout(10_000).emit(ev, p, (err, r) => (err ? no(err) : r?.error ? no(new Error(JSON.stringify(r.error))) : ok(r.data))));
  try {
    await new Promise((ok, no) => (s.once('connect', ok), s.once('connect_error', no)));
    await call('visitor.hello', { name, locale: 'vi' });
    await call('message.send', { client_id: `cite${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text });
  } finally {
    s.close();
  }
  for (let i = 0; i < 60; i++) {
    const list = (await c.req('GET', '/conversations?limit=30')).body?.data ?? [];
    const conv = list.find((x) => (x.channel === 'webchat' || x.channel_type === 'webchat') && (x.name === name || x.title === name || x.contact_name === name));
    if (conv) return conv.id;
    await sleep(500);
  }
  throw new Error(`không thấy hội thoại của khách ${name} — kiểm worker ROLE=channels`);
}

export async function seedCitations(c, base, o) {
  const stamp = Date.now().toString(36).slice(-6).toUpperCase();
  const keys = ['gio', 'gia', 'bh', 'noibo'];
  const codes = Object.fromEntries(keys.map((k) => [k, code(k)]));
  const files = Object.fromEntries(keys.map((k) => [k, `noi-bo/${k}-${randomUUID().slice(0, 6)}-${stamp.toLowerCase()}.pdf`]));
  const WORD = { gio: 'Sen Hồng', gia: 'Trúc Xanh', bh: 'Cúc Vàng', noibo: 'Ngọc Lan' };
  const labels = Object.fromEntries(keys.map((k) => [k, `${WORD[k]} ${stamp}`]));
  const TOPIC = { gio: 'mã giờ mở cửa', gia: 'mã bảng giá', bh: 'mã bảo hành', noibo: 'mã nội bộ' };
  const faq = `cite-faq-${stamp.toLowerCase()}`;
  const tagOf = { gio: faq, gia: faq, bh: faq, noibo: `cite-noibo-${stamp.toLowerCase()}` };
  const sources = {};
  const texts = {};
  for (const k of keys) {
    texts[k] = `Gói ${labels[k]}: ${TOPIC[k]} của gói ${labels[k]} là ${codes[k]}. Lễ tân đọc mã này cho khách khi được hỏi về gói ${labels[k]}.`;
    sources[k] = (await act(c, 'kb.add_source', { name: files[k], text: texts[k], visibility: 'public', learn: false, tags: [tagOf[k]] })).source_id;
  }
  const ws = c.s.ws;
  const restore = (k) => chunkOf(ws, sources[k], texts[k]);
  for (const k of keys) await restore(k);
  await waitLearned(c, stamp, keys.length);

  const prompt = 'Bạn là lễ tân spa trả lời khách qua chat website. Luôn dùng tài liệu được cung cấp; chỉ nêu mã có trong tài liệu, không có thì nói chưa có thông tin và mời khách chờ nhân viên. Không nhắc tên tệp hay mã nguồn.';
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  let agentId = list.find((a) => a.name === AGENT)?.id;
  if (!agentId) {
    const r = await c.req('POST', '/actions/agent.create_and_publish', { input: { name: AGENT, role: 'cs', tools: ['kb.search'], threshold: 60, prompt, kb_scope: { folder_ids: [], tags: [faq] } } }, { 'idempotency-key': randomUUID() });
    agentId = r.status < 300 ? r.body.data.result.agent_id : list[0]?.id;
  }
  if (!agentId) throw new Error('không có agent fixture');
  await act(c, 'agent.update', { agent_id: agentId, patch: { tools: ['kb.search'], prompt, threshold: 60, kb_scope: { folder_ids: [], tags: [faq] } } });
  await act(c, 'agent.publish', { agent_id: agentId });
  // Widget: bật, không pre-chat, agent fixture trực; tài khoản webchat ở chế độ AI theo ca (auto / gợi ý).
  await act(c, 'webchat.update_widget', { enabled: true, prechat: false, agent_id: agentId });
  const w = (await c.req('GET', '/settings/widget')).body?.data;
  if (!w?.public_key || !w.channel_account_id) throw new Error('widget chưa có public_key / tài khoản');
  const mode = async (m) => act(c, 'channel.update_settings', { channel_account_id: w.channel_account_id, patch: { ai_mode: m, agent_id: agentId } });
  let n = 0;
  const ask = (text) => visitor(c, o.api, o.io, w.public_key, `Khách cite ${stamp} ${++n}`, text);
  return { ...base, citations: { stamp, codes, files, labels, sources, agentId, mode, ask, restore, refresh: (k) => act(c, 'kb.refresh_source', { source_id: sources[k] }) } };
}
