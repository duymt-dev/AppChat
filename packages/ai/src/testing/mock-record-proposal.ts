// Model giả cho đề xuất theo bản ghi (TIP-023g, AI_ENGINE=mock — dev / E2E / integration): đọc sản phẩm nguồn + khối ỨNG VIÊN của lượt
// user, trả JSON đúng khuôn. Combo: nguồn + tối đa 2 ứng viên khác (id lấy đúng từ danh sách); chiến dịch: nội dung theo tên sản phẩm.
// Chữ trong khối <<VIỆC>> không đổi hành vi (không tool, không id ngoài danh sách).
const MARK = /^# ĐỀ XUẤT THEO BẢN GHI/;
const SOURCE = /^SẢN PHẨM NGUỒN: ([0-9a-f-]{36}) \| ([^|]*)\|/m;
const CAND = /^- ([0-9a-f-]{36}) \|/gm;

export function mockRecordProposal(system: string, user: string): string | null {
  if (!MARK.test(system)) return null;
  const src = SOURCE.exec(user);
  const id = src?.[1] ?? '';
  const name = (src?.[2] ?? 'Sản phẩm').trim();
  if (/combo/i.test(system)) {
    const others = [...user.matchAll(CAND)].map((m) => m[1]!).filter((x) => x !== id).slice(0, 2);
    return JSON.stringify({ name: `Combo ${name}`.slice(0, 160), rationale: `Gói ${name} kèm sản phẩm hay mua cùng.`, items: [{ product_id: id, qty: 1 }, ...others.map((product_id) => ({ product_id, qty: 1 }))], unresolved: [] });
  }
  return JSON.stringify({ title: `Ưu đãi ${name}`.slice(0, 160), goal: 'Tăng khách quay lại', channel: 'zalo', content: `Chào {ten}, ${name} đang có ưu đãi tuần này.`, audience_criteria: 'Khách đã mua dịch vụ tương tự trong 90 ngày' });
}
