// API công khai của domain billing cho apps/api (controller), domain khác (CreditMeter — 019/022; QuotaService — 013/014/021;
// WalletService / SubscriptionsService — 010/040) và test. Một dòng re-export ở src/index.ts (facade).
export { seedPlans } from './seed';
export { WalletService, type Balance, type LedgerInput, type WalletChange, type WalletFlags, type WalletListener } from './services/wallet.service';
export { CreditMeter, StaticPriceBook, PRICE_BOOK, type PriceBook, type ModelPrice, type UsageInput } from './services/credit-meter';
export { QuotaService, type PlanLimits } from './services/quota.service';
export { SubscriptionsService, type BillingEventSink } from './services/subscriptions.service';
export { BillingReadService, ledgerDto, LEDGER_PAGE, CREDIT_VND } from './services/billing-read.service';
export { OutboxBillingSink, walletThresholdListener, trialConsumer } from './events/billing.events';
export { BILLING_SINK } from './billing.module';
export { SCHEDULER_QUEUE, TRIAL_EXPIRY_JOB, INVOICE_SWEEP_JOB } from './jobs/billing.jobs.module';
export { InvoicesService, type CreateInvoiceInput } from './payments/invoices.service';
export { InvoiceFulfiller } from './payments/fulfil';
export { PlatformBankHook } from './payments/bank-hook.service';
export { PAYMENTS_ENV, readPaymentsEnv, type PaymentsEnv } from './payments/payments.env';
