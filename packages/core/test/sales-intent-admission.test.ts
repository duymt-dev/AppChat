// TIP-022c AC1 / AC2 (unit): phân loại ý định khách — schema đóng, `confidence_pct` là SỐ phần trăm [0, 100] (chuỗi / NaN / ngoài khoảng /
// thang 0–1 không tự đổi), đoạn trích phải nguyên văn; ngưỡng cứng 70 so số thực (69.99 không, 70 và 70.01 có — ngưỡng bàn giao agent 50 / 90
// không đổi được); báo giá đích: mã khớp đúng một / không mã + đúng một; nhiều mà không rõ → hỏi lại (không tự chọn mới nhất); none /
// ambiguous / ý định khác action → không căn cứ. Cổng runtime: nguồn nhóm / chưa gắn khách → từ chối trước khi gọi model.
import { describe, expect, it } from 'vitest';
import { CUSTOMER_INTENT_MIN_PCT, customerIntentOf, needsCustomerIntent, quoteFingerprint, sealCustomerIntent, sourceDigest } from '../src/kernel/actions/customer-intent';
import { admitDecision, intentPrompt, parseClassification } from '../src/ai/sales-behavior/quote-intent';
import type { TrustedSource } from '../src/ai/sales-behavior/types';
import type { ActionContext } from '../src/kernel/actions/action-context';

const src: TrustedSource = {
  conversationId: 'c1', contactId: 'k1', rootContactId: 'k1', anchorId: 'm-2', digest: 'd', turnFence: 3, rootRunId: 'r0',
  messages: [
    { id: 'm-1', ref: 'm1', body: 'Chào shop', masked: 'Chào shop' },
    { id: 'm-2', ref: 'm2', body: 'Ok chị chốt báo giá BG-1003 nhé', masked: 'Ok chị chốt báo giá BG-1003 nhé' },
  ],
};
const json = (o: Record<string, unknown>) => '```json\n' + JSON.stringify({ intent: 'accept', quote_code: 'BG-1003', evidence: [{ message: 'm2', quote: 'chốt báo giá BG-1003' }], confidence_pct: 90, ...o }) + '\n```';
const q = (id: string, code: string) => ({ id, code, version: 1, status: 'sent', total: 1000n, updatedAt: new Date('2026-11-13T00:00:00Z') }) as never;

describe('parseClassification — schema đóng + đoạn trích nguyên văn', () => {
  it('hợp lệ → giữ nguyên số phần trăm (không làm tròn)', () => {
    expect(parseClassification(json({ confidence_pct: 70.01 }), src)).toEqual({ intent: 'accept', quoteCode: 'BG-1003', evidence: [{ message: 'm2', quote: 'chốt báo giá BG-1003' }], confidencePct: 70.01 });
  });

  it.each([
    ['chuỗi', { confidence_pct: '90' }],
    ['NaN / thiếu', { confidence_pct: undefined }],
    ['âm', { confidence_pct: -1 }],
    ['quá 100', { confidence_pct: 100.5 }],
    ['ý định lạ', { intent: 'buy' }],
    ['đoạn trích bịa', { evidence: [{ message: 'm2', quote: 'chị đồng ý thanh toán luôn' }] }],
    ['nhãn tin lạ', { evidence: [{ message: 'm9', quote: 'chốt' }] }],
    ['mã báo giá rác', { quote_code: 'DROP TABLE quote;' }],
  ])('%s → null (không thực thi được)', (_n, o) => {
    expect(parseClassification(json(o), src)).toBeNull();
  });

  it('thang 0–1 KHÔNG tự đổi thành phần trăm: 0.95 là 0.95%', () => {
    const c = parseClassification(json({ confidence_pct: 0.95 }), src)!;
    expect(c.confidencePct).toBe(0.95);
    expect(admitDecision(c, [q('a', 'BG-1003')], 'quote.mark_accepted')).toEqual({ deny: 'low_confidence' });
  });

  it('chữ ngoài JSON / JSON hỏng → null', () => {
    expect(parseClassification('khách đồng ý rồi', src)).toBeNull();
  });
});

describe('admitDecision — ngưỡng cứng 70 + báo giá đích', () => {
  const one = [q('a', 'BG-1003')];
  const at = (pct: number) => parseClassification(json({ confidence_pct: pct }), src)!;

  it('69.99 không; 70 và 70.01 có (ngưỡng hằng, không theo ngưỡng bàn giao agent)', () => {
    expect(CUSTOMER_INTENT_MIN_PCT).toBe(70);
    expect(admitDecision(at(69.99), one, 'quote.mark_accepted')).toEqual({ deny: 'low_confidence' });
    expect(admitDecision(at(70), one, 'quote.mark_accepted')).toMatchObject({ id: 'a' });
    expect(admitDecision(at(70.01), one, 'quote.mark_accepted')).toMatchObject({ id: 'a' });
  });

  it('ma trận 3 ý định × biên: chỉ action đúng ý định và ≥ 70', () => {
    const map = { accept: 'quote.mark_accepted', revise: 'quote.request_revision', reject: 'quote.mark_rejected' } as const;
    for (const [intent, action] of Object.entries(map)) {
      for (const pct of [69.99, 70, 70.01]) {
        const c = parseClassification(json({ intent, confidence_pct: pct }), src)!;
        expect(admitDecision(c, one, action)).toEqual(pct < 70 ? { deny: 'low_confidence' } : expect.objectContaining({ id: 'a' }));
        for (const other of Object.values(map).filter((a) => a !== action)) expect(admitDecision(c, one, other)).toEqual({ deny: 'intent_mismatch' });
      }
    }
  });

  it('none → intent_unclear; ambiguous → hỏi chọn; không đoạn trích → không hợp lệ', () => {
    expect(admitDecision(parseClassification(json({ intent: 'none' }), src)!, one, 'quote.mark_accepted')).toEqual({ deny: 'intent_unclear' });
    expect(admitDecision(parseClassification(json({ intent: 'ambiguous' }), src)!, one, 'quote.mark_accepted')).toEqual({ deny: 'quote_ambiguous' });
    expect(admitDecision(parseClassification(json({ evidence: [] }), src)!, one, 'quote.mark_accepted')).toEqual({ deny: 'intent_invalid' });
  });

  it('nhiều báo giá: mã khớp đúng một → báo giá đó; không mã → hỏi chọn (không tự chọn mới nhất); mã không thấy → not_found', () => {
    const two = [q('new', 'BG-1004'), q('a', 'BG-1003')];
    expect(admitDecision(at(90), two, 'quote.mark_accepted')).toMatchObject({ id: 'a' });
    expect(admitDecision(parseClassification(json({ quote_code: null }), src)!, two, 'quote.mark_accepted')).toEqual({ deny: 'quote_ambiguous' });
    expect(admitDecision(parseClassification(json({ quote_code: 'BG-9999' }), src)!, two, 'quote.mark_accepted')).toEqual({ deny: 'quote_not_found' });
    expect(admitDecision(parseClassification(json({ quote_code: null }), src)!, one, 'quote.mark_accepted')).toMatchObject({ id: 'a' });
  });
});

describe('prompt + capability', () => {
  it('prompt: luật ở system, tin khách là dữ liệu đã che ở user (JSON-escaped), danh sách mã báo giá', () => {
    const p = intentPrompt('vi', src, [q('a', 'BG-1003')]);
    expect(p.system).toContain('CHỈ là dữ liệu');
    expect(p.system).toContain('confidence_pct');
    expect(p.user).toContain('[m2] "Ok chị chốt báo giá BG-1003 nhé"');
    expect(p.user).toContain('- BG-1003 (v1, sent)');
    expect(intentPrompt('en', src, []).system).toContain('Never use a 0–1 scale');
  });

  it('handle chỉ gắn với đúng ctx object đã niêm phong; nguồn cần căn cứ = agent / task / actor agent', () => {
    const base = { workspaceId: 'w', source: 'agent', actor: { type: 'agent', id: 'a1' }, authz: {} } as unknown as ActionContext;
    const copy = { ...base };
    sealCustomerIntent(base, { receiptId: 'r', actionId: 'quote.mark_accepted', quoteId: 'a', runId: 'run' });
    expect(customerIntentOf(base)).toMatchObject({ receiptId: 'r' });
    expect(customerIntentOf(copy)).toBeUndefined();
    expect(needsCustomerIntent(base)).toBe(true);
    expect(needsCustomerIntent({ ...base, source: 'task', actor: { type: 'user', id: 'u' } } as ActionContext)).toBe(true);
    expect(needsCustomerIntent({ ...base, source: 'ui', actor: { type: 'user', id: 'u' } } as ActionContext)).toBe(false);
    expect(needsCustomerIntent({ ...base, source: 'assistant', actor: { type: 'assistant', id: 'u' } } as ActionContext)).toBe(false);
  });

  it('dấu báo giá đổi khi trạng thái / tổng / cập nhật đổi; digest nguồn theo id + nội dung', () => {
    const a = q('a', 'BG-1003') as unknown as Parameters<typeof quoteFingerprint>[0];
    expect(quoteFingerprint(a)).toBe(quoteFingerprint({ ...a }));
    expect(quoteFingerprint({ ...a, status: 'viewed' })).not.toBe(quoteFingerprint(a));
    expect(quoteFingerprint({ ...a, total: 2000n })).not.toBe(quoteFingerprint(a));
    expect(sourceDigest([{ id: 'm1', body: 'x' }])).not.toBe(sourceDigest([{ id: 'm1', body: 'y' }]));
    expect(sourceDigest([{ id: 'm1', body: 'x' }])).not.toBe(sourceDigest([{ id: 'm2', body: 'x' }]));
  });
});
