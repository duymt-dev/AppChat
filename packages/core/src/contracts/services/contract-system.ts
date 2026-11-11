// Việc hệ thống của hợp đồng: facade mỏng — TIP-003c chuyển thân transaction sang action riêng `contract.system_transition`
// (contracts/system/*): link ký quá hạn mà khách chưa ký → `declined`; T-30 nhắc gia hạn một lần (COMMERCE §9); qua ngày kết thúc →
// `expired`. OTP "Duyệt & ký" của Owner: action `contract.request_sign_otp` (contracts/signing — TIP-030c).
import type { TenantDb } from '@appchat/db';
import type { SystemRunDeps } from '../../kernel/actions/system';
import { expireContractsDue, expireLinksDue, renewalNoticesDue } from '../system/dispatch';

/** Link ký hết hạn mà khách chưa ký → `declined` (action riêng `contract.system_transition` — TIP-003c). */
export const expireLinks = (db: TenantDb, ws: string, now: Date, d: SystemRunDeps) => expireLinksDue(db, ws, now, d);

/** T-30: nhắc gia hạn một lần mỗi hợp đồng. */
export const remindRenewal = (db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps) => renewalNoticesDue(db, ws, now, timeZone, d);

/** Qua ngày kết thúc → `expired`. */
export const expireContracts = (db: TenantDb, ws: string, now: Date, timeZone: string, d: SystemRunDeps) => expireContractsDue(db, ws, now, timeZone, d);
