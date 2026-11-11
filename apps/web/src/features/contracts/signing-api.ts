// Danh tính yêu cầu ổn định cho trang ký công khai (TIP-030c §1.2, §5.1): mỗi thao tác (open / otp / sign / decline) mang `request_id` UUID —
// giữ nguyên khi thử lại do lỗi truyền tải chưa rõ, đổi sau kết quả dứt khoát (thành công / lỗi nghiệp vụ) hoặc khi nội dung nhập đổi.
// Chỉ ở bộ nhớ (không localStorage); OTP / chữ ký không bao giờ lưu bền phía trình duyệt. Module thuần (không 'use client') — api.ts dùng.
import { ApiRequestError } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { SignView } from './types';

/** Một khoá theo thao tác: lỗi mạng giữ khoá (gửi lại = cùng yêu cầu), kết quả dứt khoát → khoá mới. */
export function requestIds() {
  const ids = new Map<string, string>();
  return async function run<T>(op: string, fingerprint: string, fn: (requestId: string) => Promise<T>): Promise<T> {
    const k = `${op}|${fingerprint}`;
    for (const key of ids.keys()) if (key.startsWith(`${op}|`) && key !== k) ids.delete(key);
    const id = ids.get(k) ?? crypto.randomUUID();
    ids.set(k, id);
    try {
      const r = await fn(id);
      ids.delete(k);
      return r;
    } catch (e) {
      if (e instanceof ApiRequestError) ids.delete(k);
      throw e;
    }
  };
}

/** Chữ ký nội dung nhập (không lưu OTP / chữ ký thô — chỉ để biết người dùng đã sửa). */
const fp = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return String(h);
};

export function signingApi(base: string) {
  const run = requestIds();
  return {
    otp: (token: string) => run('otp', token, (request_id) => transport.post<{ channel: string; sent_to: string; delivery_status?: string }>(`${base}/${token}/otp`, { request_id })),
    sign: (token: string, body: { otp: string; signature_png: string; consent: true }) =>
      run('sign', `${token}|${body.otp}|${fp(body.signature_png)}`, (request_id) => transport.post<SignView>(`${base}/${token}/sign`, { ...body, request_id })),
    decline: (token: string, reason?: string) => run('decline', `${token}|${reason ?? ''}`, (request_id) => transport.post<SignView>(`${base}/${token}/decline`, reason ? { reason, request_id } : { request_id })),
  };
}
