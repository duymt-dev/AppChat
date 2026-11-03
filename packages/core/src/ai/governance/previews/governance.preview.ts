// Preview AI Governance (TIP-023b R2.8, risk config): phạm vi dữ liệu / ranh giới / từ cấm / bộ lọc / lưu trữ / PII / vùng dữ liệu trước / sau
// chỉ phần đổi (khoá phạm vi / ranh giới lạ bỏ qua như execute). Chỉ đọc.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, governanceUpdate } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { governanceDto } from '../governance.store';

export async function governancePreview(tx: TenantTx, i: ActionInput<typeof governanceUpdate>): Promise<ActionPreview> {
  // Dòng seed lúc provision (workspace cũ thiếu → execute tạo mặc định); preview không ghi nên so với dòng mặc định ảo không có — 404.
  const row = await tx.aiGovernance.findUnique({ where: { id: 1 } });
  if (!row) throw new AppError('NOT_FOUND', 404, { governance: 'not_seeded' });
  const g = governanceDto(row);
  const flags = (list: { key: string; on: boolean }[]) => Object.fromEntries(list.map((x) => [x.key, x.on]));
  const known = (list: { key: string }[], patch: Record<string, boolean> | undefined) => (patch ? Object.fromEntries(Object.entries(patch).filter(([k]) => list.some((x) => x.key === k))) : undefined);
  const cur = { ...flags(g.scopes), ...flags(g.bounds), keywords: g.keywords, filter: g.filter, retention: g.retention, long_review: g.long_review, no_external_train: g.no_external_train, anonymize_pii: g.anonymize_pii, residency: g.residency };
  const next = {
    ...known(g.scopes, i.scopes),
    ...known(g.bounds, i.bounds),
    keywords: i.keywords ? [...new Set(i.keywords.map((k) => k.trim()).filter(Boolean))] : undefined,
    filter: i.filter,
    retention: i.retention,
    long_review: i.long_review,
    no_external_train: i.no_external_train,
    anonymize_pii: i.anonymize_pii,
    residency: i.residency,
  };
  return preview('config', `${g.applied}/${g.total}`, { changes: updated('ai_governance', '1', cur, next) });
}
