// Bề mặt công khai của domain `contracts` cho apps (controller api, worker) và domain khác (đơn hàng TIP-031 tạo từ hợp đồng).
export { ContractsReadService, type ContractViewer } from './services/contracts-read.service';
export { PublicSignService, type Client as SignClient } from './services/public-sign.service';
export type { ContractFilter } from './repos/contracts.repo';
export { ContractDeps } from './services/contract-deps';
export { readSignToken, signToken, sameOtp, otpHash } from './services/sign-link';
export { expireLinks, remindRenewal, expireContracts } from './services/contract-system';
export { certificateHtml, mergePdfs } from './services/contract-sign-pdf';
export { sweepContracts, CONTRACT_SWEEP_JOB, CONTRACTS_SCHEDULER_QUEUE } from './jobs/contracts.jobs.module';
export { AppendixReadService } from './appendix/read.service';
export { AppendixPublicService, type Client as AppendixSignClient } from './appendix/public.service';
export { readAppendixToken, appendixToken } from './appendix/tokens';
export { expireAppendixLinks } from './appendix/expiry';
// TIP-030c: ký hợp đồng cha — HMAC OTP theo thế hệ, ý định gửi OTP Owner bền + quét.
export { otpMac, otpMatches } from './signing/otp';
export { deliverOwnerOtp, recoverOwnerOtp, OWNER_OTP, SIGN_MAIL_MAX_ATTEMPTS } from './signing/delivery';
export { requestRef } from './signing/module';
