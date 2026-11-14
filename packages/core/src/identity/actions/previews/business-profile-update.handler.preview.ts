// Preview khai báo DN / hộ KD / cá nhân (TIP-023b R2.8, risk config): lần đầu → hồ sơ mới (+ cảnh báo đổi tên workspace tự tạo theo tên
// pháp lý); cập nhật → trước / sau chỉ trường đổi. Cá nhân dùng CCCD thay MST (như execute). Chỉ đọc.
import type { ActionInput, ActionPreview, businessProfileUpdate } from '@appchat/actions';
import { created, preview, updated } from '../../../kernel/actions/preview-kit';
import type { PlatformRead } from './platform-read';

export async function businessProfilePreview(p: PlatformRead, ws: string, i: ActionInput<typeof businessProfileUpdate>): Promise<ActionPreview> {
  const next = {
    kind: i.kind,
    tax_code: i.kind === 'individual' ? null : (i.tax_code ?? null),
    national_id: i.kind === 'individual' ? (i.national_id ?? null) : null,
    legal_name: i.legal_name,
    address: i.address,
    representative: i.representative ?? null,
    phone: i.phone ?? null,
    business_description: i.business_description,
  };
  const bp = await p.businessProfile.findUnique({ where: { workspaceId: ws } });
  if (!bp) {
    const w = await p.workspace.findUnique({ where: { id: ws }, select: { settings: true } });
    const rename = !!((w?.settings ?? {}) as Record<string, unknown>).auto_named;
    return preview('config', i.legal_name, { changes: [created('business_profile', Object.fromEntries(Object.entries(next).filter(([, v]) => v !== null)))], ...(rename ? { warnings: ['workspace_renamed'] } : {}) });
  }
  const cur = { kind: bp.kind, tax_code: bp.taxCode, national_id: bp.nationalId, legal_name: bp.legalName, address: bp.address, representative: bp.representative, phone: bp.phone, business_description: bp.businessDescription };
  return preview('config', i.legal_name, { changes: updated('business_profile', ws, cur, next) });
}
