// Server-side wallet history text — English.
import type { billing as vi } from '../vi/billing';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const billing: Shape<typeof vi> = {
  ledger: {
    trial_grant: 'Trial credits · {plan} plan',
    plan_grant: '{plan} plan credits',
    plan_expire: 'Previous period plan credits expired',
    plan_upgrade: 'Upgrade credit difference · {plan} plan',
    topup: 'Top-up {credits} credits',
    ai_usage: 'AI · {tokens} tokens',
    adjust: 'Credit adjustment',
    refund: 'Credit refund',
  },
  invoice: {
    plan_month: '{plan} plan · 1 month',
    plan_year: '{plan} plan · 12 months',
    credits: 'Top-up {credits} credits',
    addon_user: 'Add 1 user',
    addon_channel: 'Add 1 channel',
  },
  pdf: {
    title: 'Payment request',
    code: 'No.',
    created: 'Issued',
    seller: 'Seller',
    buyer: 'Buyer (invoicing details)',
    taxCode: 'Tax code',
    address: 'Address',
    email: 'Invoice email',
    item: 'Description',
    period: 'Period',
    amount: 'Amount (VND)',
    total: 'Total',
    status: 'Status',
    paidAt: 'Paid on',
    transfer: 'Transfer reference',
    bank: 'Receiving account',
    vatManual: 'A VAT invoice (if needed) is issued manually by the AppChat operations team using the buyer details above.',
    st: { pending: 'Awaiting payment', pending_review: 'Verifying', paid: 'Paid', expired: 'Expired', cancelled: 'Cancelled' },
    upgrade: 'Upgrade {from} → {to} (remaining period)',
  },
  source: { plan: 'Plan', ai: 'AI', assistant: 'AI Assistant', inbox: 'Inbox', marketing: 'Marketing', qr: 'VietQR', bank: 'Bank transfer', admin: 'Admin' },
};
