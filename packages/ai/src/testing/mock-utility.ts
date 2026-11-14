// Model giả cho kỹ năng tiện ích (TIP-019c, AI_ENGINE=mock — dev / E2E / integration): đọc các khối <<SOURCE id=…>> của lượt user, trả
// JSON đúng khuôn với bằng chứng offset CODEPOINT thật. Tóm tắt = câu đầu mỗi chunk; ý định theo từ khoá; trích tiền "NNNđ" / ngày
// YYYY-MM-DD; đánh giá cơ hội chỉ cho điểm tiêu chí có từ khoá. Chữ "bỏ qua chỉ dẫn…" trong nguồn không đổi hành vi (không có tool).
const BLOCK = /<<SOURCE id="([^"]+)"[^>]*>>\n([\s\S]*?)\n<<END SOURCE>>/g;
const MARK = /^# (SUMMARIZE|DETECT INTENT|EXTRACT|LEAD FIT)/m;

const blocks = (user: string) => [...user.matchAll(BLOCK)].map((m) => ({ id: m[1]!, text: m[2]! }));
const cp = (s: string, i: number) => Array.from(s.slice(0, i)).length;
function find(bs: { id: string; text: string }[], re: RegExp) {
  for (const b of bs) {
    const m = re.exec(b.text);
    if (m) {
      const start = cp(b.text, m.index);
      return { ev: { chunk_id: b.id, start, end: Math.min(start + Array.from(m[0]).length, start + 300) }, m };
    }
  }
  return null;
}

const INTENTS: [string, RegExp][] = [
  ['complaint', /khiếu nại|tệ quá|bực|complain/i],
  ['cancellation', /huỷ|hủy|cancel/i],
  ['booking', /đặt lịch|hẹn|book/i],
  ['payment_question', /chuyển khoản|thanh toán|payment/i],
  ['inquiry', /giá|bao nhiêu|price/i],
];
const LEAD: [string, RegExp][] = [
  ['buying_intent', /muốn mua|chốt|đặt cọc|giá/i],
  ['service_need', /cần|need/i],
  ['timing', /gấp|tuần này|hôm nay|ngày \d|\d{4}-\d{2}-\d{2}/i],
  ['engagement', /stage: (customer|prospect)|last_interaction|shop/i],
];

export function mockUtility(system: string, user: string): string | null {
  const kind = MARK.exec(system)?.[1];
  if (!kind) return null;
  const bs = blocks(user);
  if (kind === 'SUMMARIZE') {
    const firsts = bs.map((b) => find([b], /[^.!?\n]{1,300}/)).filter((x) => !!x);
    return JSON.stringify({ summary: firsts.map((f) => f!.m[0].trim()).join(' ').slice(0, 2000), bullets: firsts.slice(0, 3).map((f) => f!.m[0].trim().slice(0, 300)), uncertainties: [], evidence: firsts.slice(0, 10).map((f) => f!.ev) });
  }
  if (kind === 'DETECT INTENT') {
    const allowed = /Allowed labels: (.*), or "unknown"/.exec(system)?.[1] ?? '';
    for (const [label, re] of INTENTS) {
      const hit = allowed.includes(`${label} (`) ? find(bs, re) : null;
      if (hit) return JSON.stringify({ label, model_confidence: 0.8, uncertainties: [], evidence: [hit.ev] });
    }
    return JSON.stringify({ label: 'unknown', model_confidence: null, uncertainties: ['no clear intent'], evidence: [] });
  }
  if (kind === 'EXTRACT') {
    const fields = JSON.parse(/Fields: (\[.*\])$/m.exec(system)?.[1] ?? '[]') as { key: string; type: string }[];
    return JSON.stringify({
      fields: fields.map((f) => {
        const hit = f.type === 'money' ? find(bs, /(\d[\d.]*)\s*(?:đ|₫|VND)/i) : f.type === 'date' ? find(bs, /\d{4}-\d{2}-\d{2}/) : null;
        if (!hit) return { key: f.key, value: null, status: 'missing', evidence: [] };
        const value = f.type === 'money' ? hit.m[1]!.replace(/\./g, '') : hit.m[0];
        return { key: f.key, value, status: 'extracted', evidence: [hit.ev] };
      }),
    });
  }
  return JSON.stringify({
    criteria: LEAD.map(([key, re]) => {
      const hit = find(bs, re);
      return hit ? { key, score: 15, reason: `evidence: ${hit.m[0].slice(0, 60)}`, evidence: [hit.ev] } : { key, score: null, reason: null, evidence: [] };
    }),
    uncertainties: [],
  });
}
