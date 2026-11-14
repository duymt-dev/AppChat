// Seed suite `assistant-plans` (TIP-023d §Commands — 8 ca): hai agent đã xuất bản TRÙNG TÊN (khác vai trò / tool) để chấm chọn theo UUID,
// agent Sales có `quote.send` (agent gửi ngoài hội thoại đang phục vụ → luôn DUYỆT) cho ca "run con chờ duyệt". Chỉ chạy trên workspace
// fixture `[ai-live]` (live-seed.mjs đã chặn email / tên) — chạy với AI_LIVE_EMAIL riêng của suite. Bổ sung phần thiếu, không xoá gì.
// Không dữ liệu khách thật.
import { randomUUID } from 'node:crypto';

export const PL_DUP = 'Chuyên viên kế hoạch ai-live';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status !== 200) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

/** Tạo agent. Suite chạy trên workspace fixture RIÊNG (AI_LIVE_EMAIL=assistant-plans@ai-live.appchat.test — gói fixture dùng chung chỉ 2
 *  agent, đã thuộc suite khác); hết hạn mức → lỗi rõ ràng, không xoá agent của suite khác. */
const create = async (c, input) => (await act(c, 'agent.create_and_publish', input)).agent_id;

/** Hai agent cùng tên `PL_DUP`: `crm` (tạo / tra khách) và `sales` (tra + gửi báo giá). Có sẵn thì dùng lại theo vai trò. */
export async function seedPlans(c, base) {
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  const pick = (role) => list.find((a) => a.name === PL_DUP && a.role === role && a.status === 'active')?.id;
  const crm = pick('cs') ?? (await create(c, { name: PL_DUP, role: 'cs', persona: 'Tạo và tra cứu khách hàng', tools: ['contact.search', 'contact.get', 'contact.create'] }));
  const sales = pick('sales') ?? (await create(c, { name: PL_DUP, role: 'sales', persona: 'Tra cứu và gửi báo giá', tools: ['quote.search', 'quote.get', 'quote.send', 'contact.search'] }));
  return { ...base, plans: { crm, sales } };
}
