// TIP-032: route mock Đề nghị thanh toán đúng shape đọc dùng chung với API thật (packages/shared/src/api/invoices.ts) + luồng hoàn tiền
// (yêu cầu → chờ duyệt → duyệt / từ chối; vượt số còn hoàn được → 422; không tự duyệt yêu cầu của mình trừ Owner), liệu trình, tài khoản nhận.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  customerPackagesPageSchema,
  invoiceRowSchema,
  invoicesMetaSchema,
  invoicesPageSchema,
  paymentSettingsSchema,
} from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createInvoicesState } from './domains/invoices';
import { invoicesActionHandlers } from './domains/invoices-actions';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) =>
  invoicesActionHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const fail = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    const err = (e as { error?: { code: string; fields?: Record<string, string> } }).error;
    return err ? `${err.code}${err.fields ? `:${Object.values(err.fields)[0]}` : ''}` : 'throw';
  }
};

describe('mock đề nghị thanh toán — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().invoices = createInvoicesState();
    setMockRole('owner');
  });

  it('GET /invoices (D42) · /invoices/:id · /meta · /settings/payments · /contacts/:id/packages', async () => {
    expect(
      issues(invoicesPageSchema.safeParse(await mockTransport.get('/invoices', { page: 1, limit: 5 }))),
    ).toEqual([]);
    expect(issues(invoiceRowSchema.safeParse(await mockTransport.get('/invoices/inv_2041')))).toEqual([]);
    expect(issues(invoicesMetaSchema.safeParse(await mockTransport.get('/invoices/meta')))).toEqual([]);
    expect(issues(paymentSettingsSchema.safeParse(await mockTransport.get('/settings/payments')))).toEqual(
      [],
    );
    const pk = customerPackagesPageSchema.parse(await mockTransport.get('/contacts/ct_lan/packages'));
    expect(pk.data.map((p) => [p.id, p.remaining])).toEqual([['pkg_lan_1', 7]]);
  });

  it('hoàn tiền: yêu cầu → hàng chờ duyệt → duyệt; vượt số còn hoàn → 422; chưa thu → nothing_to_refund', async () => {
    expect(
      await fail(() => run('payment.refund', { invoice_id: 'inv_2041', amount: '99000000', reason: 'x' })),
    ).toBe('VALIDATION_FAILED:over_refundable');
    expect(await fail(() => run('payment.refund', { invoice_id: 'inv_2040', reason: 'x' }))).toBe(
      'VALIDATION_FAILED:nothing_to_refund',
    );
    const r = run('payment.refund', { invoice_id: 'inv_2041', amount: '5000000', reason: 'Khách đổi ý' }) as {
      payment_id: string;
    };
    const meta = invoicesMetaSchema.parse(await mockTransport.get('/invoices/meta'));
    expect(meta.refunds.map((x) => x.id)).toEqual([r.payment_id]);
    expect(invoiceRowSchema.parse(await mockTransport.get('/invoices/inv_2041')).refund_pending).toBe(
      '5000000',
    );
    run('payment.refund_approve', { payment_id: r.payment_id });
    const row = invoiceRowSchema.parse(await mockTransport.get('/invoices/inv_2041'));
    expect([row.refunded, row.refund_pending]).toEqual(['5000000', '0']);
    expect(row.events.at(-1)?.type).toBe('refunded');
    expect(
      await fail(() => run('payment.refund', { invoice_id: 'inv_2041', amount: '14000000', reason: 'x' })),
    ).toBe('VALIDATION_FAILED:over_refundable');
  });

  it('tách nhiệm vụ: kế toán không duyệt yêu cầu của mình; từ chối cần lý do và trả lại số còn hoàn', async () => {
    setMockRole('accountant');
    const r = run('payment.refund', { invoice_id: 'inv_2038', reason: 'trùng' }) as {
      payment_id: string;
      amount: string;
    };
    expect(r.amount).toBe('9500000');
    expect(await fail(() => run('payment.refund_approve', { payment_id: r.payment_id }))).toBe(
      'FORBIDDEN:self_approval',
    );
    setMockRole('owner');
    run('payment.refund_reject', { payment_id: r.payment_id, note: 'Đã trao đổi lại' });
    expect(invoiceRowSchema.parse(await mockTransport.get('/invoices/inv_2038')).refund_pending).toBe('0');
    expect(run('payment.refund', { invoice_id: 'inv_2038', reason: 'lần 2' })).toMatchObject({
      amount: '9500000',
    });
  });

  it('liệu trình: gia hạn / chỉnh buổi (không dưới số đã dùng) + hoàn tác; tài khoản nhận + bank feed', async () => {
    run('package.extend', { package_id: 'pkg_lan_1', days: 30 });
    expect(mockDb().invoices.packages[0]!.expires_at).toBe('2027-01-30');
    invoicesActionHandlers['package.extend']!.undo!(mockDb(), {} as never);
    expect(mockDb().invoices.packages[0]!.expires_at).toBe('2026-12-31');
    expect(
      await fail(() =>
        run('package.adjust_sessions', { package_id: 'pkg_lan_1', total_sessions: 2, reason: 'x' }),
      ),
    ).toBe('VALIDATION_FAILED:below_used');
    expect(
      run('package.adjust_sessions', { package_id: 'pkg_lan_1', total_sessions: 3, reason: 'x' }),
    ).toMatchObject({ status: 'exhausted' });
    run('payment_account.update', {
      bank: 'ACB',
      bank_bin: '970416',
      account_no: '123456789',
      account_name: 'an nhien',
    });
    expect(run('bank_feed.connect', { provider: 'sepay', fields: {} })).toMatchObject({
      webhook_path: '/hooks/tenant-payments/sepay/feed_sepay',
    });
    const s = paymentSettingsSchema.parse(await mockTransport.get('/settings/payments'));
    expect([s.payment_account?.account_name, s.bank_feeds[0]?.status]).toEqual(['AN NHIEN', 'active']);
  });
});
