// Preview đăng ký quan tâm connector "Sắp có" (TIP-023b R2.8): tên connector + đã đăng ký trước đó → không đổi; connector lạ → 404, đang
// dùng được → 422 như execute. Chỉ đọc DB nền tảng.
import { AppError } from '@appchat/shared';
import { connectorRegistry } from '@appchat/integrations';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, integrationRegisterInterest } from '@appchat/actions';
import { created, preview } from '../../../kernel/actions/preview-kit';

export async function interestPreview(p: Pick<PlatformDb, 'integrationInterest'>, ws: string, i: ActionInput<typeof integrationRegisterInterest>): Promise<ActionPreview> {
  const e = connectorRegistry.get(i.provider);
  if (!e) throw new AppError('NOT_FOUND', 404, { provider: 'unknown' });
  if (e.manifest.status !== 'coming_soon') throw new AppError('VALIDATION_FAILED', 422, { provider: 'available' });
  const before = await p.integrationInterest.findUnique({ where: { workspaceId_connectorKey: { workspaceId: ws, connectorKey: i.provider } }, select: { connectorKey: true } });
  return preview('write', e.manifest.name, { changes: before ? [] : [created('integration_interest', { connector_key: i.provider })] });
}
