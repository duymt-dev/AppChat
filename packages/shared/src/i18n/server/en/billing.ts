// Server-side wallet history text — English.
import type { billing as vi } from '../vi/billing';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

export const billing: Shape<typeof vi> = {
  ledger: {
    trial_grant: 'Trial credits · {plan} plan',
    plan_grant: '{plan} plan credits',
    plan_expire: 'Previous period plan credits expired',
    topup: 'Top-up {credits} credits',
    ai_usage: 'AI · {tokens} tokens',
    adjust: 'Credit adjustment',
    refund: 'Credit refund',
  },
  source: { plan: 'Plan', ai: 'AI', assistant: 'AI Assistant', inbox: 'Inbox', marketing: 'Marketing', qr: 'VietQR', bank: 'Bank transfer', admin: 'Admin' },
};
