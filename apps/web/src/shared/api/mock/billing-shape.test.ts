// TIP-009 / 010: route mock domain billing đúng shape đọc dùng chung với API thật (packages/shared/src/api/billing.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { billInvoicesPageSchema, billingCatalogSchema, billingSummarySchema, ledgerPageSchema, walletSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

type Done<O> = { data: { result: O } };
const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);

describe('mock billing — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /billing/summary', async () => {
    expect(issues(billingSummarySchema.safeParse(await mockTransport.get('/billing/summary')))).toEqual([]);
  });

  it('GET /billing/plans', async () => {
    expect(issues(billingCatalogSchema.safeParse(await mockTransport.get('/billing/plans')))).toEqual([]);
  });

  it('GET /billing/wallet', async () => {
    expect(issues(walletSchema.safeParse(await mockTransport.get('/billing/wallet')))).toEqual([]);
  });

  it('GET /billing/ledger — lọc vào-ra / nguồn / kỳ như server (TIP-039), cursor tải thêm', async () => {
    const all = await mockTransport.get('/billing/ledger', { limit: 4 });
    expect(issues(ledgerPageSchema.safeParse(all))).toEqual([]);
    const page = all as { data: { delta: number; source: string }[]; next_cursor: string | null };
    expect(page.data).toHaveLength(4);
    const more = (await mockTransport.get('/billing/ledger', { limit: 4, cursor: page.next_cursor })) as typeof page;
    expect(more.next_cursor).toBeNull();
    const out = (await mockTransport.get('/billing/ledger', { dir: 'out' })) as typeof page;
    expect(out.data.every((r) => r.delta < 0)).toBe(true);
    const mkt = (await mockTransport.get('/billing/ledger', { source: 'marketing' })) as typeof page;
    expect(mkt.data.map((r) => r.source)).toEqual(['Marketing']);
    const range = (await mockTransport.get('/billing/ledger', { from: '2026-06-25', to: '2026-06-27' })) as typeof page;
    expect(range.data).toHaveLength(3);
  });

  it('GET /billing/invoices — hoá đơn mới có QR; báo chuyển khoản → pending_review, webhook giả về ngay → paid', async () => {
    const r = (await mockTransport.action('billing.create_invoice', { kind: 'credit', item: 'credit_500' })) as Done<{ invoice_id: string }>;
    const id = r.data.result.invoice_id;
    const page = await mockTransport.get<{ data: { id: string; status: string; qr?: unknown }[] }>('/billing/invoices');
    expect(issues(billInvoicesPageSchema.safeParse(page))).toEqual([]);
    expect(page.data.find((i) => i.id === id)).toMatchObject({ status: 'pending', qr: expect.any(Object) });
    const rep = (await mockTransport.action('billing.report_transfer', { invoice_id: id })) as Done<{ status: string }>;
    expect(rep.data.result.status).toBe('pending_review');
    const after = await mockTransport.get<{ data: { id: string; status: string }[] }>('/billing/invoices');
    expect(after.data.find((i) => i.id === id)?.status).toBe('paid');
  });
});
