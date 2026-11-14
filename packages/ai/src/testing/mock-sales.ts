// Kịch bản bán hàng của model giả (TIP-022c — dev / E2E http, KHÔNG phải model thật): lượt agent trực kênh có tool tồn kho / báo giá.
//   - "còn <n> <tên>…" / "lấy <n> <tên>": product.search(tên) → sales_plan cho sản phẩm đầu tiên tìm thấy (kết luận còn hàng — server
//     dựng câu từ tồn thật; lệch → chuyển người);
//   - "chốt báo giá" / "đồng ý báo giá": quote.search → quote.mark_accepted(báo giá đầu) — cổng ý định khách chạy lượt phân loại;
//   - lượt phân loại ý định (PHÂN LOẠI Ý ĐỊNH KHÁCH): "chốt / đồng ý" → accept 92%, còn lại none;
//   - lượt kiểm khẳng định (KIỂM CÂU TRẢ LỜI BÁN HÀNG): không khẳng định.
// Không khớp → null (kịch bản chung xử lý).
// Kiểu cấu trúc tại chỗ (mock-model import file này — không import ngược, tránh vòng).
type Turn = { text: string } | { tool: string; input: unknown };
interface Ctx {
  lastUser: string;
  system: string;
  lastTool: { tool: string; output: unknown } | null;
  toolResults: number;
}

const ACCEPT = /(chốt|đồng ý)\s*(báo giá|bg)/i;
const STOCK = /(?:còn|lấy)\s+(\d{1,3})\s+(?:hộp|chai|tuýp|cái|gói)?\s*([^?.,!\n]{2,40})/i;

const items = (output: unknown): { id?: string; product_id?: string; quote_id?: string }[] => {
  const o = output as { result?: { items?: unknown[]; products?: unknown[]; quotes?: unknown[] } } | null;
  const list = o?.result?.items ?? o?.result?.products ?? o?.result?.quotes ?? [];
  return Array.isArray(list) ? (list as { id?: string; product_id?: string; quote_id?: string }[]) : [];
};

const final = (o: Record<string, unknown>): Turn => ({ text: JSON.stringify({ intent: 'buy', sentiment: 'neutral', needs_human: null, confidence: 0.9, ...o }) });

export function mockSales(c: Ctx): Turn | null {
  if (c.system.includes('PHÂN LOẠI Ý ĐỊNH KHÁCH')) {
    const m = /\[(m\d+)\] "([^"]*)"/g;
    let hit: { ref: string; text: string } | null = null;
    for (let r = m.exec(c.lastUser); r; r = m.exec(c.lastUser)) if (ACCEPT.test(r[2]!)) hit = { ref: r[1]!, text: r[2]! };
    return { text: JSON.stringify(hit ? { intent: 'accept', quote_code: null, evidence: [{ message: hit.ref, quote: hit.text.slice(0, 80) }], confidence_pct: 92 } : { intent: 'none', quote_code: null, evidence: [], confidence_pct: 90 }) };
  }
  if (c.system.includes('KIỂM CÂU TRẢ LỜI BÁN HÀNG')) return { text: '{"claims":[],"ambiguous":false}' };
  if (!c.system.includes('"needs_human"')) return null;
  if (ACCEPT.test(c.lastUser) || (c.lastTool?.tool === 'quote__search')) {
    if (c.toolResults === 0) return { tool: 'quote__search', input: { status: 'sent' } };
    if (c.lastTool?.tool === 'quote__search') {
      const q = items(c.lastTool.output)[0];
      const id = q?.quote_id ?? q?.id;
      return id ? { tool: 'quote__mark_accepted', input: { quote_id: id } } : final({ reply: 'Dạ chị cho em mã báo giá giúp em nhé.' });
    }
    return final({ reply: 'Dạ em đã ghi nhận ạ.', confidence: 0.55 });
  }
  const s = STOCK.exec(c.lastUser);
  if (s || c.lastTool?.tool === 'product__search') {
    if (c.toolResults === 0 && s) return { tool: 'product__search', input: { query: s[2]!.trim() } };
    const p = c.lastTool?.tool === 'product__search' ? items(c.lastTool.output)[0] : null;
    const id = p?.product_id ?? p?.id;
    const qty = Number(STOCK.exec(c.lastUser)?.[1] ?? 1);
    return id ? final({ reply: 'Dạ', sales_plan: { items: [{ product_id: id, qty, claim: 'available_now' }], narrative: 'Dạ em kiểm giúp chị nhé.' } }) : final({ reply: 'Dạ em chưa tìm thấy sản phẩm này ạ.', confidence: 0.4 });
  }
  return null;
}
