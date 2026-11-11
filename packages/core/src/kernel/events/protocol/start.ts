// Điều phối khởi động sự kiện v2 (TIP-003b §5.1–5.2): gọi SAU khi Nest init xong (mọi provider đã đăng ký) — đóng băng registry theo
// tập topic khai báo, đánh giá manifest kỳ vọng (độc lập), rồi mới đặt sẵn sàng. Lưu bảng hợp đồng bất biến (version + digest) vào DB
// tenant là bước của cutover (`persistRegistryVersion`) — trước khi bật epoch của workspace đó. Thiếu DB / Redis ở production → không
// sẵn sàng (không giả là đã chạy).
import { EVENT_SCHEMAS } from '@appchat/shared';
import type { TenantTx } from '../../actions/action-context';
import { evaluateReadiness, setEventReadiness, type EventProtocolManifest, type Readiness } from './readiness';
import { freezeEventRegistry, registryDigest } from './registry';
import type { RegistryTable } from './types';

export interface StartEventsOptions {
  manifest: EventProtocolManifest;
  role: string;
  /** DB + Redis có cấu hình (jobs cần cả hai). */
  infra: boolean;
}

export function startEventProtocol(o: StartEventsOptions): Readiness {
  const frozen = freezeEventRegistry(Object.keys(EVENT_SCHEMAS));
  const r = evaluateReadiness(o.manifest, frozen, o.role);
  if (!o.infra) {
    r.ready = false;
    r.blockers.push('infra_unavailable');
  }
  setEventReadiness(r);
  return r;
}

/**
 * Lưu bảng hợp đồng bất biến vào tenant: cùng digest → trả version đã có; khác → version mới (không bao giờ sửa nội dung version cũ).
 * Gọi trong transaction cutover của workspace.
 */
export async function persistRegistryVersion(tx: TenantTx, table: RegistryTable): Promise<number> {
  const digest = registryDigest(table);
  const [hit] = await tx.$queryRaw<{ version: number }[]>`SELECT version FROM event_registry_version WHERE digest = ${digest}`;
  if (hit) return hit.version;
  const [r] = await tx.$queryRaw<{ version: number }[]>`
    INSERT INTO event_registry_version (version, digest, contracts)
    SELECT COALESCE(MAX(version), 0) + 1, ${digest}, ${JSON.stringify(table)}::jsonb FROM event_registry_version
    RETURNING version`;
  return r!.version;
}
