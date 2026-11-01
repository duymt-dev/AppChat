// Bề mặt công khai của domain `contracts` cho apps (controller api, worker) và domain khác (đơn hàng TIP-031 tạo từ hợp đồng).
export { ContractsReadService, type ContractViewer } from './services/contracts-read.service';
export { PublicSignService, type Client as SignClient } from './services/public-sign.service';
export type { ContractFilter } from './repos/contracts.repo';
export { ContractDeps } from './services/contract-deps';
export { readSignToken, signToken, sameOtp, otpHash } from './services/sign-link';
export { expireLinks, remindRenewal, expireContracts, sendOwnerOtp } from './services/contract-system';
export { certificateHtml, mergePdfs } from './services/contract-sign-pdf';
export { sweepContracts, CONTRACT_SWEEP_JOB, CONTRACTS_SCHEDULER_QUEUE } from './jobs/contracts.jobs.module';
