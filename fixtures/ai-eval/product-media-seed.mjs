// Seed suite `product-media` (TIP-027b AC2/AC4/AC6): mỗi lượt một sản phẩm theo khoá lượt (`tag`) của Owner + tệp người dùng đưa cho Trợ
// lý (ảnh PNG thật → `assistant.attachment_prepare` → ready qua worker ROLE=ai) + một agent fixture chỉ đọc catalog (product.search /
// product.get / product.media_list — không có quyền ghi catalog vì product.* ghi agentGrantable=false). Theo loại ca:
//   formatted — sản phẩm có mô tả chữ thuần → Trợ lý đề xuất mô tả có định dạng qua product.update (xác nhận) → đọc lại description_doc.
//   attach    — ảnh PNG sẵn (artifact), đích nêu bằng mã sản phẩm → sao chép có đồng ý vào media sản phẩm, ảnh đầu = ảnh chính.
//   unresolved — ảnh sẵn, không nêu sản phẩm (hai sản phẩm cùng tên gần giống) → hỏi lại, không gắn.
//   restricted — chọn agent fixture chỉ đọc + nhờ gắn ảnh → không ghi (không tự chuyển sang Trợ lý đầy đủ), nói rõ cần người làm.
//   retained  — artifact ảnh đã bị gỡ khỏi Trợ lý (attachment_remove trước khi gửi; câu nêu id / revision cũ) → nguồn không còn hợp lệ,
//               không thành media sản phẩm.
//   malformed — người dùng dán "tài liệu mô tả" JSON có nút html / link → schema đóng từ chối; không lưu nút ngoài danh sách, không nói
//               "đã cập nhật" khi sản phẩm không đổi.
// Chỉ chạy trên workspace fixture `[ai-live]`; không xoá gì, không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { prepared } from './assistant-input-seed.mjs';

const AGENT = 'Tra cứu sản phẩm [ai-live]';
const TOOLS = ['product.search', 'product.get', 'product.media_list'];

async function act(c, id, input) {
  const key = randomUUID();
  let r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': key });
  if (r.status === 202 && r.body?.data?.confirm_token) r = await c.req('POST', `/actions/${id}`, { input, confirm_token: r.body.data.confirm_token }, { 'idempotency-key': key });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

// PNG tối thiểu đủ cho bộ kiểm cấu trúc (IHDR + IDAT rỗng nén + IEND) — cùng dạng fixtures/product-media/images.ts.
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const chunk = (type, data = []) => [...be32(data.length), ...Buffer.from(type, 'latin1'), ...data, 0, 0, 0, 0];
export const png = (w, h) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk('IHDR', [...be32(w), ...be32(h), 8, 6, 0, 0, 0]), ...chunk('IDAT', [0x78, 0x9c, 0, 0]), ...chunk('IEND')]);

/** Agent fixture chỉ đọc catalog (gói giới hạn số agent — dùng lại theo tên, mỗi lượt đặt lại tool). */
async function readerAgent(c) {
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  const have = list.find((a) => a.name === AGENT);
  if (!have) return (await act(c, 'agent.create_and_publish', { name: AGENT, role: 'sales', persona: 'Tra cứu sản phẩm, giá và ảnh sản phẩm — chỉ đọc, không sửa sản phẩm', tools: TOOLS })).agent_id;
  const cur = (await c.req('GET', `/agents/${have.id}`)).body?.data;
  if ((cur?.tools ?? []).join() !== TOOLS.join()) {
    await act(c, 'agent.update', { agent_id: have.id, patch: { tools: TOOLS } });
    await act(c, 'agent.publish', { agent_id: have.id });
  }
  return have.id;
}

export async function seedProductMedia(c, base, o) {
  const agent = await readerAgent(c);

  async function fresh(tag, kind) {
    const name = `Serum ${tag} [ai-live]`;
    const p = await act(c, 'product.create', { name, type: 'physical', price: '450000', description: 'Serum phục hồi da\nDùng sáng và tối' });
    const out = { product: { id: p.product_id, code: p.code, name } };
    if (kind === 'formatted' || kind === 'malformed') return out;
    const fileName = `anh-${tag}.png`;
    const art = await prepared(o.api, c, { name: fileName, mime: 'image/png', body: png(640, 480) });
    if (kind === 'unresolved') {
      const twin = await act(c, 'product.create', { name: `Serum ${tag} mini [ai-live]`, type: 'physical', price: '250000' });
      return { ...out, fileName, artifact: art, twin: { id: twin.product_id, code: twin.code } };
    }
    if (kind === 'retained') {
      // Người dùng gỡ tệp khỏi khung Trợ lý trước khi gửi → artifact huỷ (revision +1); handle cũ không còn là nguồn hợp lệ.
      await act(c, 'assistant.attachment_remove', { artifact_id: art.artifact_id, if_revision: art.revision });
      return { ...out, fileName, artifact: art };
    }
    return { ...out, fileName, artifact: art };
  }
  return { ...base, productMedia: { fresh, agent } };
}
