// Thế hệ cấu hình opaque cho provider / route (TIP-023e §1.2): HMAC-SHA256 khoá bằng ENC_KEY (APP_ENC_KEY) trên các trường canonical
// đã lưu — đổi key / header / base_url / capabilities / status (provider) hay id / model / params / priority (route) đều đổi thế hệ.
// Không dựa vào `updated_at` (ModelRoute không có cột này) hay độ dài API key (xoay khoá cùng độ dài phải vẫn đổi thế hệ). Kết quả là
// digest một chiều dùng làm KHOÁ CACHE CỤC BỘ của router — không bao giờ trả ra API / log, cũng không suy ngược được bí mật gốc.
import { createHmac } from 'node:crypto';

export interface ProviderFingerprint {
  key: string;
  kind: string;
  baseUrl: string | null;
  capabilities: unknown;
  status: string;
  /** Phiên bản CAS của dòng (`llm_provider.version`) — tăng ở MỌI lần sửa (đổi key / header / URL / probe). */
  version: number;
  /** Byte mã hoá của key / header — đưa dưới HMAC để đổi ngay cả khi `version` chưa kịp tăng (phòng thủ kép, không xuất ra). */
  apiKeyEnc: Uint8Array | null;
  headersEnc: Uint8Array | null;
}

export interface RouteFingerprint {
  id: string;
  model: string;
  params: unknown;
  priority: number;
}

/** JSON ổn định (khoá sắp theo thứ tự chữ) — tránh cùng object khác thứ tự khoá ra hai digest khác nhau. */
const stable = (v: unknown): string => (v && typeof v === 'object' ? JSON.stringify(v, Object.keys(v as Record<string, unknown>).sort()) : JSON.stringify(v ?? null));

function hmac(encKey: Buffer, label: string, parts: readonly string[]): string {
  return createHmac('sha256', encKey).update(label).update('\u0000').update(parts.join('\u0000')).digest('hex');
}

/** Thế hệ của một provider — dùng làm `ProviderConfig.configRevision`. */
export function providerRevision(encKey: Buffer, p: ProviderFingerprint): string {
  return hmac(encKey, 'provider', [
    p.key,
    p.kind,
    p.baseUrl ?? '',
    stable(p.capabilities),
    p.status,
    String(p.version),
    p.apiKeyEnc ? Buffer.from(p.apiKeyEnc).toString('hex') : '',
    p.headersEnc ? Buffer.from(p.headersEnc).toString('hex') : '',
  ]);
}

/** Thế hệ của một route — dùng làm `RouteRow.configRevision`; router kết hợp cùng thế hệ provider để khoá cache theo từng ứng viên. */
export function routeRevision(encKey: Buffer, r: RouteFingerprint): string {
  return hmac(encKey, 'route', [r.id, r.model, stable(r.params), String(r.priority)]);
}

/**
 * Thế hệ KHÔNG GIAN embedding của một route (TIP-020e §1.1): chỉ các trường quyết định vector — model + params. Không gồm id / priority:
 * `admin.model_route.upsert` xoá rồi tạo lại cả nhóm (id mới) và thêm route dự phòng đổi priority — vector của model cũ vẫn nguyên, kho
 * không được bị coi là "model đã gỡ" / cũ chỉ vì lưu lại cấu hình (khoá cache handle vẫn theo `routeRevision`).
 */
export function spaceRevision(encKey: Buffer, r: Pick<RouteFingerprint, 'model' | 'params'>): string {
  return hmac(encKey, 'space', [r.model, stable(r.params)]);
}
