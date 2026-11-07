// Định nghĩa trường còn hiệu lực theo entity + phiên bản (TIP-045b annex C) — đọc một lần mỗi request / transaction (bảng nhỏ, có index
// (entity, sort)); phiên bản = dấu thời gian sửa mới nhất + số dòng, dùng làm khoá cache ở FE / ref server.
import type { CustomFieldEntity } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { FieldDefs } from './types';

type Db = Pick<TenantTx, 'customFieldDef'>;

export async function liveDefs(db: Db, entity: CustomFieldEntity): Promise<{ defs: FieldDefs; version: string }> {
  const rows = await db.customFieldDef.findMany({ where: { entity, deletedAt: null }, select: { key: true, roles: true, ai: true, sys: true, updatedAt: true } });
  const at = rows.reduce((m, r) => Math.max(m, r.updatedAt.getTime()), 0);
  return { defs: rows.map(({ key, roles, ai, sys }) => ({ key, roles, ai, sys })), version: `${rows.length}.${at}` };
}
