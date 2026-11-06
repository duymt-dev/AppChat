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
  source: { plan: 'Plan', ai: 'AI', assistant: 'AI Assistant', inbox: 'Inbox', marketing: 'Marketing', qr: 'VietQR', bank: 'Bank transfer', admin: 'Admin' },
};
