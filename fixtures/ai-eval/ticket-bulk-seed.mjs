// Seed suite `ticket-bulk` (TIP-034c AC7 / §4.3): mỗi lượt tạo bộ ticket MỚI mang khoá lượt `tag` của Owner (tiêu đề "… $TAG"), theo loại ca:
//   combined   — 3 ticket mở; Trợ lý đọc / tìm rồi đề xuất MỘT ticket.bulk_update giao người + ưu tiên cao (patch kết hợp).
//   mixed      — 2 ticket mở + 1 ticket ĐÃ ĐÓNG; Trợ lý báo từng mã (đóng = không đổi được), không nói "đã đổi hết".
//   background — 55 ticket mở (> 50) → 202 việc nền: Trợ lý nói đang chạy, không báo đã xong.
//   undo       — 2 ticket đã được đổi ưu tiên hàng loạt bằng API (log cha có sẵn) + 1 ticket bị sửa tay SAU đó → hoàn tác qua
//                ticket.bulk_undo: một phần (1 hoàn tác, 1 xung đột giữ nguyên), không nói "đã hoàn tác hết".
//   agent      — agent fixture chỉ có kỹ năng đọc ticket được chọn → không ghi (ticket.bulk_update không cấp cho agent), nói rõ cần người.
//   export     — một thao tác hàng loạt có sẵn; Trợ lý gọi ticket.bulk_export (Excel) → tệp tải được; không URL bịa.
// Chạy trên workspace fixture RIÊNG (`AI_LIVE_EMAIL=ticket-bulk@ai-live.appchat.test`). Không xoá gì, không in / ghi bí mật.
import { randomUUID } from 'node:crypto';

const AGENT = 'Tra cứu ticket [ai-live]';
const TOOLS = ['ticket.search'];

async function act(c, id, input) {
  const key = randomUUID();
  let r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': key });
  if (r.status === 202 && r.body?.data?.confirm_token) r = await c.req('POST', `/actions/${id}`, { input, confirm_token: r.body.data.confirm_token }, { 'idempotency-key': key });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data;
}

/** Agent fixture chỉ đọc ticket (dùng lại theo tên, mỗi lượt đặt lại tool). */
async function readerAgent(c) {
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  const have = list.find((a) => a.name === AGENT);
  if (!have) return (await act(c, 'agent.create_and_publish', { name: AGENT, role: 'cs', persona: 'Tra cứu ticket — chỉ đọc, không sửa ticket', tools: TOOLS })).result.agent_id;
  const cur = (await c.req('GET', `/agents/${have.id}`)).body?.data;
  if ((cur?.tools ?? []).join() !== TOOLS.join()) {
    await act(c, 'agent.update', { agent_id: have.id, patch: { tools: TOOLS } });
    await act(c, 'agent.publish', { agent_id: have.id });
  }
  return have.id;
}

export async function seedTicketBulk(c) {
  const agent = await readerAgent(c);
  const meta = (await c.req('GET', '/tickets/meta')).body?.data;
  const member = (meta?.members ?? []).find((m) => m.role !== 'owner') ?? (meta?.members ?? [])[0];
  if (!member) throw new Error('không có thành viên để giao ticket (tickets/meta)');

  const create = async (title, priority = 'medium') => (await act(c, 'ticket.create', { title, channel: 'email', category: 'Khác', priority })).result;
  const get = async (id) => (await c.req('GET', `/tickets/${id}`)).body?.data ?? null;

  async function fresh(tag, kind) {
    const n = kind === 'background' ? 55 : kind === 'mixed' || kind === 'undo' ? 3 : 3;
    const made = [];
    for (let i = 0; i < n; i++) made.push(await create(`Khách hỏi lịch ${tag} ${i + 1}`, kind === 'mixed' || kind === 'undo' ? 'medium' : 'low'));
    const out = { tickets: made, codes: made.map((t) => t.code), member, agent, logId: null };
    if (kind === 'mixed') await act(c, 'ticket.close', { ticket_id: made[2].ticket_id, reason: 'resolved' });
    if (kind === 'undo' || kind === 'export') {
      // Thao tác hàng loạt có sẵn (log cha) — đổi ưu tiên 2 ticket đầu; ca undo: sửa tay ticket thứ 2 SAU đó (xung đột).
      const r = await act(c, 'ticket.bulk_update', { ticket_ids: made.slice(0, 2).map((t) => t.ticket_id), priority: 'high' });
      out.logId = r.action_log_id;
      out.codes = made.slice(0, 2).map((t) => t.code);
      if (kind === 'undo') await act(c, 'ticket.update', { ticket_id: made[1].ticket_id, priority: 'low' });
    }
    return out;
  }
  return { ticketBulk: { fresh, get } };
}
