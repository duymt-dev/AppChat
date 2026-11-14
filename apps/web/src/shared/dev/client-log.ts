// Log lỗi phía trình duyệt (TIP-001b §2) — một chỗ cho error boundary route / panel. Chỉ ghi mã nhận dạng (tên lỗi, `digest` của lỗi
// server), KHÔNG ghi message / stack / dữ liệu nhập: message của lỗi client có thể chứa dữ liệu người dùng (observability-security §1.4).
// Chưa có kênh gửi lỗi web về server (Blueprint §11) → console; đổi đích ở đây khi có, không sửa từng boundary.

export interface ClientErrorRecord {
  scope: string;
  name: string;
  digest?: string;
}

export function describeError(scope: string, error: unknown): ClientErrorRecord {
  const name = error instanceof Error ? error.name : typeof error;
  const digest = error && typeof error === 'object' && 'digest' in error && typeof error.digest === 'string' ? error.digest : undefined;
  return { scope, name, ...(digest ? { digest } : {}) };
}

export function logClientError(scope: string, error: unknown): ClientErrorRecord {
  const rec = describeError(scope, error);
  console.error('[appchat:error]', rec);
  return rec;
}
