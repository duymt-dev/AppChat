// Preview thông tin workspace (TIP-023b R2.8, risk config): tên / ngôn ngữ / múi giờ / thông tin chung (website, SĐT hỗ trợ, email quản trị,
// định dạng ngày) + MST / địa chỉ (hồ sơ DN) trước / sau chỉ trường đổi; chưa khai báo DN mà đổi MST / địa chỉ → 409 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, workspaceUpdate } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { generalOf } from '../../settings/workspace-settings';
import type { PlatformRead } from './platform-read';

export async function workspaceUpdatePreview(p: PlatformRead, ws: string, i: ActionInput<typeof workspaceUpdate>): Promise<ActionPreview> {
  const w = await p.workspace.findUniqueOrThrow({ where: { id: ws }, select: { name: true, locale: true, timezone: true, settings: true } });
  const bp = await p.businessProfile.findUnique({ where: { workspaceId: ws }, select: { taxCode: true, address: true } });
  if (!bp && (i.tax_code !== undefined || i.address !== undefined)) throw new AppError('CONFLICT', 409, { business_profile: 'not_declared' });
  const g = generalOf(w.settings);
  const cur = { name: w.name, locale: w.locale, timezone: w.timezone, tax_code: bp?.taxCode ?? null, address: bp?.address ?? null, website: g.website ?? null, support_phone: g.support_phone ?? null, admin_email: g.admin_email ?? null, date_format: g.date_format ?? null };
  const patch = { name: i.name, locale: i.locale, timezone: i.timezone, tax_code: i.tax_code === undefined ? undefined : i.tax_code || null, address: i.address, website: i.website, support_phone: i.support_phone, admin_email: i.admin_email, date_format: i.date_format };
  return preview('config', i.name ?? w.name, { changes: updated('workspace', ws, cur, patch) });
}
