// Seed suite `crm-activities` (TIP-026b AC7–AC9): khách "Trần Văn Nam" của live-seed (mã khách thật) + một cơ hội có giá trị kỳ vọng
// 48.000.000 (Owner đọc được — ca `hidden` chấm số trong câu trả lời). Tệp CSV 3 tập theo khoá lượt (`tag`) — tìm khách bằng mã khách,
// mỗi tệp 1 dòng hợp lệ + 1 dòng bị chặn (khách không có / việc đã xong / cơ hội đã thắng), SĐT trong tệp để kiểm model không thấy số thật.
import { randomUUID } from 'node:crypto';

const NAME = 'Trần Văn Nam';
const OPP = 'Gói liệu trình năm [ai-live]';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

export async function seedActivities(c, base) {
  const nam = base.contacts[NAME];
  const page = await c.req('GET', `/contacts/${nam.id}/activities?kind=opportunities&limit=100`);
  const has = JSON.stringify(page.body?.data ?? {}).includes(OPP);
  if (!has) await act(c, 'contact_opportunity.create', { contact_id: nam.id, title: OPP, amount_vnd: '48000000', stage: 'proposal', probability: 50 });
  return { ...base, activity: { contact: nam.id, code: nam.code, amount: '48000000' } };
}

/** Tệp theo tập: `valid` = số dòng phải ghi; `needle` = chuỗi phải có trong hoạt động thật sau khi nhập. */
export function files(tag, code) {
  const d = String(parseInt(tag, 36) % 1_000_000).padStart(6, '0');
  const phone = `09${d}77`;
  return {
    contact_notes: {
      name: `ghi-chu-${tag}.csv`,
      body: [`Mã khách,SĐT liên hệ,Loại,Nội dung`, `${code},${phone},Ghi chú,Khách hẹn tái khám ${tag}`, `KH-KHONG-CO-${tag},,Ghi chú,Lạc khách ${tag}`].join('\r\n'),
      valid: 1,
      needle: `Khách hẹn tái khám ${tag}`,
    },
    contact_tasks: {
      name: `viec-${tag}.csv`,
      body: [`Mã khách,SĐT liên hệ,Công việc,Hạn chót,Trạng thái`, `${code},${phone},Gọi xác nhận lịch ${tag},20/12/2026,Mở`, `${code},,Đã gọi rồi ${tag},,Hoàn thành`].join('\r\n'),
      valid: 1,
      needle: `Gọi xác nhận lịch ${tag}`,
    },
    contact_opportunities: {
      name: `co-hoi-${tag}.csv`,
      body: [`Mã khách,SĐT liên hệ,Cơ hội,Giá trị kỳ vọng,Giai đoạn`, `${code},${phone},Combo da ${tag},12.000.000,Đề xuất`, `${code},,Đã chốt ${tag},5.000.000,Thắng`].join('\r\n'),
      valid: 1,
      needle: `Combo da ${tag}`,
    },
  };
}
