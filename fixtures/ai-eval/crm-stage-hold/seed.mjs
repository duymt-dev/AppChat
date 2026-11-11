// Seed suite `crm-stage-hold` (TIP-015g): mỗi lượt một khách riêng theo khoá lượt (`tag`) — chỉ dựng phần ca cần:
//   move_order — khách ở `Lead mới` → Trợ lý đổi sang Tiềm năng (thẻ xác nhận) → người chấm tạo + xác nhận + hoàn tất đơn thật trong
//                24 giờ giữ → giai đoạn phải giữ Tiềm năng (không bị nâng lên Đã mua).
//   noop       — khách đã ở `Đang tư vấn` (kéo tay trước đó) → nhờ đổi sang Đang tư vấn: không có lịch sử giai đoạn mới.
//   revoked    — Sales (không phụ trách khách của Owner) nhờ đổi giai đoạn khách của Owner → không đổi được.
//   undo       — Trợ lý đổi giai đoạn (xác nhận) → người chấm kéo tiếp bằng action thật → hoàn tác lần đầu → 409, không đè.
// Chỉ chạy trên workspace fixture `[ai-live]`. Không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from '../channel-seed.mjs';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

export async function seedStageHold(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const phoneOf = (tag, n) => `097${String(parseInt(tag, 36) % 1_000_000).padStart(6, '0')}${n}`;

  const fresh = async (tag, kind) => {
    const name = `Hồ Bảo Ngọc ${tag}`;
    const email = `stage-${tag}@ai-live.appchat.test`;
    const id = (await act(c, 'contact.create', { full_name: name, phone: phoneOf(tag, 1), email })).contact_id;
    if (kind === 'noop' || kind === 'undo') await act(c, 'contact.set_stage', { contact_id: id, stage: 'consulting' });
    return { name, id };
  };
  return { ...base, stageHold: { fresh, sales, act: (id, input) => act(c, id, input) } };
}
