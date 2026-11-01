// TIP-029 unit: link xem báo giá (token ký), bộ luật soạn nháp (ý định + parse JSON model), gợi ý cột AI + dòng API.
import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { intentByRules, parseIntent, quoteToken, readQuoteToken } from '../src/sales/public';
import { toQuoteRow } from '../src/sales/quotes/services/quote-view';
import type { QuoteRecord } from '../src/sales/quotes/quote-access';

const WS = '0190f000-0000-7000-8000-000000000001';
const Q = '0190f000-0000-7000-8000-000000000002';

describe('link xem báo giá', () => {
  it('token ký đọc lại được; sửa id / chữ ký / khoá khác → null', () => {
    const key = randomBytes(32);
    const t = quoteToken(key, WS, Q);
    expect(readQuoteToken(key, t)).toEqual({ ws: WS, quoteId: Q });
    expect(readQuoteToken(key, t.replace(Q, '0190f000-0000-7000-8000-000000000003'))).toBeNull();
    expect(readQuoteToken(key, `${t.slice(0, -1)}A`)).toBeNull();
    expect(readQuoteToken(randomBytes(32), t)).toBeNull();
    expect(readQuoteToken(key, 'rác')).toBeNull();
  });
});

describe('AI soạn từ nội dung', () => {
  it('bộ luật: tách cụm, số lượng "x2 / 8 buổi", "giảm 5%" thành CK tổng', () => {
    expect(intentByRules('Chị Lan lấy HIFU nâng cơ 8 buổi + Serum B5 x2, giảm 5%')).toEqual({
      lines: [{ text: 'Chị Lan lấy HIFU nâng cơ 8 buổi', qty: 8 }, { text: 'Serum B5 x2', qty: 2 }],
      discountPct: 5,
    });
  });

  it('parse JSON model: đúng định dạng → ý định; sai / rỗng → null (rơi về bộ luật)', () => {
    expect(parseIntent('Đây: {"lines":[{"text":"HIFU","qty":2}],"discount_pct":null}')).toEqual({ lines: [{ text: 'HIFU', qty: 2 }], discountPct: null });
    expect(parseIntent('{"lines":[]}')).toBeNull();
    expect(parseIntent('không có JSON')).toBeNull();
  });
});

describe('dòng API + gợi ý AI', () => {
  const base = {
    id: Q, code: 'BG-1001', version: 1, rootQuoteId: Q, contactId: WS, ownerUserId: null, templateId: null, templateVersion: null, conversationId: null,
    subtotal: 0n, lineDiscountTotal: 0n, headerDiscount: null, discountTotal: 0n, taxTotal: 0n, total: 0n, validDays: 15, remindedAt: null, viewedAt: null,
    orderId: null, note: '', gift: '', paymentTerms: '', offCatalog: false, createdByType: 'user', createdById: null, approvedBy: null, sentChannel: null,
    decidedAt: null, fileId: null, fileSha256: null, custom: {}, createdAt: new Date('2026-07-01T03:00:00Z'), updatedAt: new Date(), deletedAt: null,
  };
  const ctx = { locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh', now: new Date('2026-07-14T03:00:00Z'), names: new Map<string, string>() };
  const items = [{ name: 'HIFU', qty: 1, unit_price: '25000000', tax_rate: 8 }];
  const row = (q: Partial<QuoteRecord>) => toQuoteRow({ ...base, ...q } as QuoteRecord, { items, contact: undefined, comments: [] }, ctx);

  it('nháp vượt ngưỡng → lý do + gợi ý gửi duyệt (wait); hạn dự kiến = cuối ngày (hôm nay + 15)', () => {
    const r = row({ status: 'draft', sentAt: null, validUntil: null });
    expect(r.approval_reasons).toEqual(['total']);
    expect(r.ai.wait).toBe(true);
    expect(r.valid_until).toBe('2026-07-29T16:59:59.999Z');
  });

  it('đã gửi còn 2 ngày → nhắc chốt; còn xa → theo dõi', () => {
    expect(row({ status: 'sent', sentAt: new Date('2026-07-01T03:00:00Z'), validUntil: new Date('2026-07-16T16:59:59.999Z') }).ai).toEqual({ hint: 'Còn 2 ngày hiệu lực — nhắc khách chốt', wait: true });
    expect(row({ status: 'viewed', sentAt: new Date('2026-07-10T03:00:00Z'), validUntil: new Date('2026-07-25T16:59:59.999Z') }).ai.wait).toBe(false);
  });
});
