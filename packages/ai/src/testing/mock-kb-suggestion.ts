// Model giả cho prompt `kb-suggestion` (TIP-043, AI_ENGINE=mock — dev / E2E / integration): đọc khối HỘI THOẠI `[m:<id>] NGƯỜI: chữ`,
// ghép mỗi câu KHÁCH có dấu "?" với câu NHÂN VIÊN / AGENT ngay sau → cặp hỏi–đáp. Cố ý KHÔNG kiểm "khách xác nhận" hay dữ liệu biến
// động — server (suggestion.rules) phải tự lọc; câu chứa "[mock:bịa-id]" → trả mã tin bịa để test server loại.
const LINE = /^\[m:([0-9a-f-]{36})\] (KHÁCH|CUSTOMER|NHÂN VIÊN|STAFF|AGENT): (.*)$/;

export function mockKbSuggestion(conversation: string): string {
  const msgs = conversation
    .split('\n')
    .map((l) => LINE.exec(l.trim()))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ id: m[1]!, who: m[2]!, text: m[3]! }));
  const pairs: { question: string; answer: string; source_message_ids: string[] }[] = [];
  msgs.forEach((m, i) => {
    if (!/KHÁCH|CUSTOMER/.test(m.who) || !m.text.includes('?')) return;
    const a = msgs[i + 1];
    if (!a || /KHÁCH|CUSTOMER/.test(a.who)) return;
    const after = msgs[i + 2];
    const ids = [m.id, a.id, ...(after && /KHÁCH|CUSTOMER/.test(after.who) ? [after.id] : [])];
    if (m.text.includes('[mock:bịa-id]')) ids.push('00000000-0000-4000-8000-0000000000ff');
    pairs.push({ question: m.text.replace('[mock:bịa-id]', '').trim(), answer: a.text, source_message_ids: ids });
  });
  return JSON.stringify({ pairs: pairs.slice(0, 5) });
}
