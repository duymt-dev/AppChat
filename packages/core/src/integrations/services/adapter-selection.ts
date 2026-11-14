// Chọn chế độ + adapter của kết nối (TIP-012b §1.1). Chế độ do người kết nối chọn tường minh (hoặc giữ chế độ đã lưu khi kết nối lại /
// mặc định live), phải thuộc `manifest.modes`; `sandbox` (adapter giả lập) bị cấm ở production. Adapter tra đúng chế độ của dòng kết nối —
// KHÔNG lùi live → sandbox; thiếu adapter = chưa hỗ trợ (webhook 404, thăm dò `unsupported`), không bao giờ là thành công giả.
import { AppError } from '@appchat/shared';
import { adapterFor, resolveMode, type ConnectionMode, type ConnectorAdapter, type ConnectorEntry, type ConnectorRegistry } from '@appchat/integrations';

/** Môi trường cho phép kết nối sandbox (dev / test). */
export const sandboxAllowed = (env: Record<string, string | undefined>) => env.NODE_ENV !== 'production';

/** Chế độ hợp lệ cho lần kết nối này hoặc 422 `{ mode: 'unsupported' }`. `saved` = chế độ của kết nối đang dùng (kết nối lại). */
export function pickMode(e: ConnectorEntry, requested: ConnectionMode | undefined, saved: ConnectionMode | undefined, allowSandbox: boolean): ConnectionMode {
  const mode = resolveMode(e.manifest, requested ?? saved);
  if (!mode || (mode === 'sandbox' && !allowSandbox)) throw new AppError('VALIDATION_FAILED', 422, { mode: 'unsupported' });
  return mode;
}

/** Adapter của một dòng kết nối theo đúng chế độ đã lưu. */
export function adapterOf<A extends ConnectorAdapter = ConnectorAdapter>(registry: ConnectorRegistry, connectorKey: string, mode: ConnectionMode): A | null {
  return adapterFor<A>(registry.get(connectorKey), mode) ?? null;
}

/** Adapter mặc định của connector (cho metadata form: "thăm dò được không") — chế độ mặc định của manifest. */
export function defaultAdapter(e: ConnectorEntry): ConnectorAdapter | null {
  const mode = resolveMode(e.manifest);
  return (mode && adapterFor(e, mode)) || null;
}
