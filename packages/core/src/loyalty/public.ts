// API công khai của domain loyalty cho apps/api + domain khác (orders / payments — TIP-036 P2; CRM 360°, ngữ cảnh agent).
export { MemberReadService, ledgerText, type LoyaltyViewer } from './services/member-read.service';
export { readConfig, configDto, type LoyaltyConf } from './services/config.service';
export { LOYALTY_SEED } from './loyalty.seed';
export { earnSnapshot, reverseCompletion, netBeforeVat, type EarnBasis } from './services/order-points';
export { loyaltyOrdersConsumer, loyaltySystemCtx, LOYALTY_ORDERS_CONSUMER } from './events/order-consumer';
export { loyaltyPaymentsConsumer, LOYALTY_PAYMENTS_CONSUMER } from './events/payment-consumer';
export { sweepLoyalty, expireDue as expireLoyalty, reviewTiers, reviewWindow, LOYALTY_SWEEP_JOB } from './jobs/loyalty.scheduler';
