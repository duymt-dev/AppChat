// Seed bổ sung cho suite `runtime-integrity` (TIP-019b AC10): hai agent đã xuất bản để Trợ lý giao việc — Sales (tra / gửi báo giá:
// `quote.send` từ agent ngoài hội thoại đang phục vụ luôn phải DUYỆT) và CSKH (chỉ tra khách). Chỉ chạy trên workspace fixture `[ai-live]`
// (live-seed.mjs đã chặn email / tên). Bổ sung phần thiếu, không xoá gì.
import { randomUUID } from 'node:crypto';

export const RT_SALES = 'Sales báo giá ai-live';
export const RT_CS = 'CSKH tra cứu ai-live';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status !== 200) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

async function agent(c, name, role, persona, tools) {
  const list = (await c.req('GET', '/agents')).body?.data ?? [];
  const found = list.find((a) => a.name === name);
  if (found) return found.id;
  return (await act(c, 'agent.create_and_publish', { name, role, persona, tools })).agent_id;
}

export async function seedRuntime(c, base) {
  const sales = await agent(c, RT_SALES, 'sales', 'Tra cứu và gửi báo giá cho khách', ['quote.search', 'quote.get', 'quote.send', 'contact.search']);
  const cs = await agent(c, RT_CS, 'cs', 'Tra cứu thông tin khách hàng', ['contact.search']);
  return { ...base, runtime: { sales, cs } };
}
