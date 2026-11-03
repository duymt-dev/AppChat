// TIP-030b spec 9–11 — AI soạn hợp đồng: ý định model đúng khung → dùng; sai khung / có HTML → null hoặc chữ thuần; bộ luật khi không có
// model; hash nội dung ổn định theo khoá; khối gợi ý Giữ / Bỏ theo version (CAS), cổng trình duyệt chặn khi còn pending; HTML khối đã Giữ
// luôn escape, khối Bỏ không render.
import { describe, expect, it } from 'vitest';
import { cleanClause, draftByRules, hashOf, parseDraftIntent, pendingOf, type AiSuggestion } from '../src/contracts/files/draft-content';
import { assertResolved, keptHtml, proposalActor, resolveSuggestion } from '../src/contracts/files/suggestions';

describe('parseDraftIntent', () => {
  it('JSON đúng khung (kể cả trong ```json```) → ý định; gợi ý làm sạch thẻ HTML', () => {
    const r = parseDraftIntent('```json\n{"title":"HĐ trị mụn","start_date":"2026-12-01","end_date":"2027-11-30","lines":[{"text":"Liệu trình trị mụn 10 buổi","qty":1}],"suggestions":["<b>Bảo hành</b> 30 ngày"]}\n```');
    expect(r).toEqual({ title: 'HĐ trị mụn', startDate: '2026-12-01', endDate: '2027-11-30', lines: [{ text: 'Liệu trình trị mụn 10 buổi', qty: 1 }], suggestions: ['Bảo hành 30 ngày'] });
  });

  it('sai khung / không JSON / số lượng âm → null (rơi về bộ luật)', () => {
    expect(parseDraftIntent('Đã nhận: soạn hợp đồng')).toBeNull();
    expect(parseDraftIntent('{"lines":[{"text":"x","qty":-1}]}')).toBeNull();
    expect(parseDraftIntent('{"start_date":"01/12/2026"}')).toBeNull();
  });

  it('model không có trường giá: JSON có "price" / "value" bị bỏ qua (giá chỉ từ catalog)', () => {
    const r = parseDraftIntent('{"title":"","lines":[{"text":"Serum","qty":2,"price":1}],"value":"999"}');
    expect(r?.lines).toEqual([{ text: 'Serum', qty: 2 }]);
    expect(JSON.stringify(r)).not.toContain('999');
  });
});

describe('draftByRules', () => {
  it('dòng theo dấu phẩy, ngày dd/mm/yyyy (kết thúc sau bắt đầu)', () => {
    const r = draftByRules('Liệu trình trị mụn 10 buổi, Serum dưỡng ẩm 30ml 2, từ 01/12/2026 đến 30/11/2027');
    expect(r.startDate).toBe('2026-12-01');
    expect(r.endDate).toBe('2027-11-30');
    expect(r.lines.map((l) => l.text)).toEqual(['Liệu trình trị mụn 10 buổi', 'Serum dưỡng ẩm 30ml 2']);
    expect(r.lines[1]!.qty).toBe(2);
    expect(r.suggestions).toEqual([]);
  });

  it('ngày sai (31/02) bị bỏ; kết thúc trước bắt đầu → null', () => {
    expect(draftByRules('Gói da 31/02/2026').startDate).toBeNull();
    expect(draftByRules('Gói da từ 01/12/2027 đến 01/12/2026').endDate).toBeNull();
  });
});

describe('hash + chữ thuần', () => {
  it('hash không phụ thuộc thứ tự khoá', () => {
    expect(hashOf({ a: 1, b: [1, { c: 2, d: 3 }] })).toBe(hashOf({ b: [1, { d: 3, c: 2 }], a: 1 }));
    expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
  });

  it('cleanClause bỏ thẻ + ký tự điều khiển, cắt 2000', () => {
    expect(cleanClause('<script>x</script>Điều 9\u0007')).toBe('x Điều 9');
    expect(cleanClause('a'.repeat(3000))).toHaveLength(2000);
  });

  it('người yêu cầu: Trợ lý / agent làm thay = người ra lệnh', () => {
    expect(proposalActor({ actor: { type: 'system', id: 'assistant' }, onBehalfOfUserId: 'u1' } as never)).toBe('user:u1');
    expect(proposalActor({ actor: { type: 'user', id: 'u2' } } as never)).toBe('user:u2');
  });
});

describe('khối gợi ý AI', () => {
  const list: AiSuggestion[] = [
    { id: 's1', text: 'Bảo hành 30 ngày', status: 'pending', version: 1 },
    { id: 's2', text: '<img src=x onerror=alert(1)>', status: 'pending', version: 1 },
  ];

  it('Giữ / Bỏ theo version; version cũ → CONFLICT kèm version hiện tại', () => {
    const a = resolveSuggestion(list, 's1', 'keep', 1);
    expect(a).toMatchObject({ status: 'kept', version: 2, pending: 1 });
    expect(() => resolveSuggestion(a.next, 's1', 'discard', 1)).toThrow(expect.objectContaining({ httpStatus: 409, fields: { version: '2' } }));
    expect(() => resolveSuggestion(list, 'nope', 'keep', 1)).toThrow(expect.objectContaining({ httpStatus: 404 }));
  });

  it('cổng trình duyệt: còn pending → 422 ai_suggestions unresolved; xử lý hết → qua', () => {
    expect(() => assertResolved(list)).toThrow(expect.objectContaining({ httpStatus: 422, fields: { ai_suggestions: 'unresolved' } }));
    const done = resolveSuggestion(resolveSuggestion(list, 's1', 'keep', 1).next, 's2', 'discard', 1).next;
    expect(pendingOf(done)).toBe(0);
    expect(() => assertResolved(done)).not.toThrow();
    expect(() => assertResolved([])).not.toThrow();
  });

  it('HTML khối đã Giữ escape; khối Bỏ / pending không render', () => {
    const kept = resolveSuggestion(resolveSuggestion(list, 's2', 'keep', 1).next, 's1', 'discard', 1).next;
    const html = keptHtml(kept, 'Điều khoản bổ sung');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('Bảo hành');
    expect(keptHtml(list, 'x')).toBe('');
  });
});
