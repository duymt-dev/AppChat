// TIP-029: route mock domain báo giá đúng shape đọc dùng chung với API thật (packages/shared/src/api/quotes.ts) + luồng ghi theo
// QUOTE_FLOW (sai trạng thái → INVALID_TRANSITION, vượt ngưỡng → QUOTE_NEEDS_APPROVAL, xin sửa → lần n+1, bản cũ superseded khi gửi).
import { beforeEach, describe, expect, it } from 'vitest';
import { publicQuoteSchema, quoteRowSchema, quotesMetaSchema, quotesPageSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createQuotesState } from './domains/quotes';
import { quotesHandlers } from './domains/quotes-actions';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) => quotesHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const code = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string } }).error?.code ?? 'throw';
  }
};

describe('mock báo giá — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().quotes = createQuotesState();
    setMockRole('owner');
  });

  it('GET /quotes (D42) · /quotes/:id · /versions · /meta', async () => {
    expect(issues(quotesPageSchema.safeParse(await mockTransport.get('/quotes', { page: 1, limit: 5 })))).toEqual([]);
    expect(issues(quoteRowSchema.safeParse(await mockTransport.get('/quotes/q_2041')))).toEqual([]);
    expect(issues(quotesMetaSchema.safeParse(await mockTransport.get('/quotes/meta', { quote_id: 'q_2041' })))).toEqual([]);
    const vs = (await mockTransport.get('/quotes/q_2040/versions')) as unknown[];
    expect(vs.every((v) => quoteRowSchema.safeParse(v).success)).toBe(true);
  });

  it('luồng: đã duyệt gửi → sent; sửa sau gửi → INVALID_TRANSITION; xin sửa → lần 2, gửi lần 2 → lần 1 superseded; link công khai → viewed', async () => {
    run('quote.send', { quote_id: 'q_2041' });
    expect(code(() => run('quote.update', { quote_id: 'q_2041', patch: { note: 'x' } }))).toBe('INVALID_TRANSITION');
    const next = run('quote.request_revision', { quote_id: 'q_2040' }) as { quote_id: string; version: number };
    expect(next.version).toBe(2);
    expect(mockDb().quotes.quotes.find((q) => q.id === 'q_2040')!.status).toBe('revision_requested');
    run('quote.send', { quote_id: next.quote_id });
    expect(mockDb().quotes.quotes.find((q) => q.id === 'q_2040')!.status).toBe('superseded');
    const pub = await mockTransport.get(`/public/quotes/${next.quote_id}`);
    expect(issues(publicQuoteSchema.safeParse(pub))).toEqual([]);
    expect(mockDb().quotes.quotes.find((q) => q.id === next.quote_id)!.status).toBe('viewed');
    expect(await mockTransport.blob(`/quotes/${next.quote_id}/pdf`)).toBeInstanceOf(Blob);
  });

  it('vượt ngưỡng (tổng > 20tr) từ nháp → QUOTE_NEEDS_APPROVAL; duyệt rồi gửi được', () => {
    const c = run('quote.create', { contact_id: mockDb().customers.contacts[0]!.id, items: [{ name: 'Gói năm', qty: 1, unit_price: '25000000', tax_rate: 8 }] }) as { quote_id: string };
    expect(code(() => run('quote.send', { quote_id: c.quote_id }))).toBe('QUOTE_NEEDS_APPROVAL');
    expect(code(() => run('quote.approve', { quote_id: c.quote_id }))).toBe('INVALID_TRANSITION');
    run('quote.submit_for_approval', { quote_id: c.quote_id });
    run('quote.approve', { quote_id: c.quote_id });
    expect(code(() => run('quote.send', { quote_id: c.quote_id }))).toBeNull();
  });
});
