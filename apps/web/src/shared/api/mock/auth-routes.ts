// Mock của Blueprint §4.2 (auth & phiên) — endpoint ngoài Action Registry.
import { ApiRequestError } from '@appchat/shared';
import type { MockDb } from './store';

type Body = Record<string, unknown>;
export type MockPost = (db: MockDb, body: Body) => unknown;

const fail = (status: number, code: 'VALIDATION_FAILED' | 'NOT_FOUND' | 'UNAUTHENTICATED', message: string): never => {
  throw new ApiRequestError(status, { code, message });
};

const login = (db: MockDb) => {
  db.session.authed = true;
  return { access_token: 'mock', user: db.shell.me.user, needs_declare: !db.session.declared };
};

export const mockPosts: Record<string, MockPost> = {
  // OTP Email (D-OTP / OQ-02): luôn 204, kể cả email không tồn tại (chống dò tài khoản)
  '/auth/otp/request': (_db, body) => {
    if (typeof body.email !== 'string' || !body.email.includes('@')) fail(422, 'VALIDATION_FAILED', 'email');
    return undefined;
  },
  '/auth/otp/verify': (db, body) => {
    if (!/^\d{6}$/.test(String(body.code ?? ''))) fail(422, 'VALIDATION_FAILED', 'code');
    // Đăng ký mới: workspace chưa khai báo → popup khai báo, rồi khởi tạo, rồi chào mừng trial 15 ngày
    if (body.purpose === 'register') {
      Object.assign(db.session, { declared: false, trialSeen: false, expiredSeen: false, trialDaysLeft: 15, provisioned: false });
    }
    return login(db);
  },
  '/auth/password/login': (db, body) => {
    if (!body.email || !body.password) fail(422, 'VALIDATION_FAILED', 'credentials');
    return login(db);
  },
  '/auth/password/reset-request': () => undefined,
  '/auth/password/reset': (_db, body) => {
    if (String(body.password ?? '').length < 8) fail(422, 'VALIDATION_FAILED', 'password');
    return undefined;
  },
  // Đã xem màn chào mừng trial / thông báo hết trial (prototype ac_trialseen / ac_expiredseen)
  '/session/ack': (db, body) => {
    if (body.notice === 'trial_welcome') db.session.trialSeen = true;
    else if (body.notice === 'trial_expired') db.session.expiredSeen = true;
    else fail(422, 'VALIDATION_FAILED', 'notice');
    return undefined;
  },
  '/auth/logout': (db) => {
    db.session.authed = false;
    return undefined;
  },
};

/** GET /v1/business-lookup/tax/:taxCode — VietQR qua TaxLookupProvider (OQ-05); không thấy → 404, UI cho nhập tay. */
export const taxLookup = (db: MockDb, taxCode: string) => {
  const digits = taxCode.replace(/\D/g, '');
  const hit = db.auth.tax_lookup[digits as keyof typeof db.auth.tax_lookup];
  if (hit) return hit;
  // Prototype tra MST nào cũng trả cùng mẫu — giữ hành vi đó cho MST hợp lệ 10 / 13 số
  if (digits.length === 10 || digits.length === 13) return Object.values(db.auth.tax_lookup)[0];
  return fail(404, 'NOT_FOUND', 'tax_code');
};
