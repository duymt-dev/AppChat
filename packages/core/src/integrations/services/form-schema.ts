// Metadata form kết nối + thăm dò connector (TIP-023c G3, DEF-012-1). Nguồn tin cậy duy nhất là `ConnectorManifest.auth.fields`
// (+ phép chiếu zod được hỗ trợ của `auth.schema`: string / email / url / số, max length) — không đọc giá trị credential, không trả
// schema thực thi, không để model tự phân loại ô bí mật. Hình zod ngoài danh sách → lỗi cấu hình (UnsupportedAuthSchema), không đoán.
// Thăm dò: gọi `adapter.test` với bản nháp (không lưu) hoặc kết nối hiện có, giới hạn 10 giây; lỗi adapter được làm sạch (không trả
// thông điệp provider). Không có adapter / `coming_soon` → `unsupported` rõ ràng, không bao giờ `ok`. Không gọi URL tuỳ ý.
import type { AuthField, ConnectionCtx, ConnectorEntry, ConnectorRegistry } from '@appchat/integrations';
import { AppError, type AuthFieldDto } from '@appchat/shared';
import { adapterFor } from '@appchat/integrations';

export const PROBE_TIMEOUT_MS = 10_000;

export type FormField = AuthFieldDto;
type FieldType = FormField['type'];

/** Manifest khai `auth.schema` có hình ngoài phép chiếu hỗ trợ — lỗi của connector, không phải của người dùng. */
export class UnsupportedAuthSchema extends Error {
  constructor(readonly provider: string, readonly field: string) {
    super(`auth.schema ${provider}.${field}: unsupported shape`);
  }
}

const KNOWN_CHECKS = new Set(['string_format', 'max_length', 'min_length']);

interface ZodLike {
  type?: string;
  _zod?: { def?: { type?: string; checks?: { _zod?: { def?: { check?: string; format?: string; maximum?: number } } }[]; innerType?: ZodLike } };
  def?: { type?: string };
  shape?: Record<string, ZodLike>;
}

/** Phép chiếu đã hỗ trợ của một ô zod → kiểu + max; không có schema → string; hình khác → null (người gọi từ chối). */
function project(z: ZodLike | undefined): Pick<FormField, 'type' | 'max'> | null {
  if (!z) return { type: 'string' };
  let d = z._zod?.def;
  if (d?.type === 'optional' && d.innerType) d = d.innerType._zod?.def;
  if (d?.type === 'number') return (d.checks ?? []).length ? null : { type: 'number' };
  if (d?.type !== 'string') return null;
  let type: FieldType = 'string';
  let max: number | undefined;
  for (const c of d.checks ?? []) {
    const cd = c._zod?.def;
    if (!cd?.check || !KNOWN_CHECKS.has(cd.check)) return null;
    if (cd.check === 'string_format') {
      if (cd.format !== 'email' && cd.format !== 'url') return null;
      type = cd.format;
    }
    if (cd.check === 'max_length' && typeof cd.maximum === 'number') max = cd.maximum;
  }
  return max ? { type, max } : { type };
}

export function formFields(e: ConnectorEntry): FormField[] {
  const shape = (e.manifest.auth.schema as ZodLike | undefined)?.shape;
  return e.manifest.auth.fields.map((f: AuthField) => {
    const p = project(shape?.[f.key]);
    if (!p) throw new UnsupportedAuthSchema(e.manifest.key, f.key);
    return { key: f.key, secret: !!f.secret, optional: !!f.optional, ...p };
  });
}

/** Connector có trong registry hay 404 (không lộ chi tiết). */
export function connectorEntry(registry: ConnectorRegistry, provider: string): ConnectorEntry {
  const e = registry.get(provider);
  if (!e) throw new AppError('NOT_FOUND', 404, { provider: 'not_found' });
  return e;
}

export type ProbeResult = { status: 'ok' } | { status: 'failed'; reason: 'rejected' | 'timeout' } | { status: 'unsupported'; reason: 'coming_soon' | 'no_test' } | { status: 'not_connected' };

/** Gọi `adapter.test` với hạn 10 giây; lỗi → `failed` đã làm sạch. */
export async function probe(e: ConnectorEntry, conn: ConnectionCtx, timeoutMs = PROBE_TIMEOUT_MS): Promise<ProbeResult> {
  if (e.manifest.status === 'coming_soon') return { status: 'unsupported', reason: 'coming_soon' };
  const adapter = adapterFor(e, conn.mode);
  if (!adapter?.test) return { status: 'unsupported', reason: 'no_test' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((r) => (timer = setTimeout(() => r('timeout'), timeoutMs)));
  try {
    const r = await Promise.race([adapter.test(conn).then(() => 'ok' as const), timeout]);
    return r === 'ok' ? { status: 'ok' } : { status: 'failed', reason: 'timeout' };
  } catch {
    // Thông điệp provider có thể chứa dữ liệu nhạy cảm → không trả.
    return { status: 'failed', reason: 'rejected' };
  } finally {
    clearTimeout(timer);
  }
}
