// API công khai của domain loyalty cho apps/api + domain khác (orders / payments — TIP-036 P2; CRM 360°, ngữ cảnh agent).
export { MemberReadService, ledgerText, type LoyaltyViewer } from './services/member-read.service';
export { readConfig, configDto, type LoyaltyConf } from './services/config.service';
export { LOYALTY_SEED } from './loyalty.seed';
