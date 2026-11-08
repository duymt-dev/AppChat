// PackagesRead (TIP-033b §1.3, §4): reader liệu trình dùng chung cho GET /contacts/:id/packages, action `package.list_for_contact`, lịch
// hẹn (chiếu theo lô) và tệp xuất. Kiểm khách gốc thấy được theo CRM trước (ngoài scope → 404), rồi lọc gói trong SQL theo scope bán hàng
// của đơn (repository.ts). Cursor mờ gắn khách + bộ lọc: dùng cursor của khách / bộ lọc khác → 409 (phải tải lại). Limit 30, tối đa 100.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { visibleContact } from '../../../crm/public';
import { packageIds, packagePage, packagesById } from './repository';
import { toPackageDto, type PackageDto } from './projection';

export const PACKAGE_LIMIT = 30;
export const PACKAGE_MAX = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PackageListInput {
  contactId: string;
  status?: string;
  serviceId?: string;
  cursor?: string;
  limit?: number;
}

const bindOf = (i: PackageListInput, rootId: string) => `${rootId}|${i.status ?? ''}|${i.serviceId ?? ''}`;
const enc = (bind: string, at: Date, id: string) => Buffer.from(`${bind}|${at.toISOString()}|${id}`).toString('base64url');

function dec(cursor: string, bind: string): { createdAt: Date; id: string } {
  const parts = Buffer.from(cursor, 'base64url').toString().split('|');
  const id = parts.pop() ?? '';
  const at = new Date(parts.pop() ?? '');
  if (!UUID.test(id) || Number.isNaN(at.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  if (parts.join('|') !== bind) throw new AppError('CONFLICT', 409, { cursor: 'stale' });
  return { createdAt: at, id };
}

export async function listPackages(tx: TenantTx, authz: AuthzContext, i: PackageListInput): Promise<{ packages: PackageDto[]; next_cursor: string | null }> {
  const { contact } = await visibleContact(tx, authz, i.contactId);
  if (i.serviceId && !UUID.test(i.serviceId)) throw new AppError('VALIDATION_FAILED', 422, { service_id: 'invalid' });
  const limit = Math.min(Math.max(i.limit ?? PACKAGE_LIMIT, 1), PACKAGE_MAX);
  const bind = bindOf(i, contact.id);
  const rows = await packagePage(tx, authz, { rootId: contact.id, status: i.status, serviceId: i.serviceId, after: i.cursor ? dec(i.cursor, bind) : undefined, limit: limit + 1 });
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { packages: page.map(toPackageDto), next_cursor: rows.length > limit && last ? enc(bind, last.created_at, last.id) : null };
}

/** Chiếu theo lô id gói (lịch hẹn): Map id → DTO chỉ gồm gói người xem đọc được; gói bị chặn vắng mặt (người gọi trả package = null). */
export async function packagesFor(tx: TenantTx, authz: AuthzContext, ids: readonly (string | null)[]): Promise<Map<string, PackageDto>> {
  const rows = await packagesById(tx, authz, ids.filter((x): x is string => !!x && UUID.test(x)));
  return new Map(rows.map((r) => [r.id, toPackageDto(r)]));
}

const STATUSES = new Set(['active', 'exhausted', 'expired', 'refunded']);

/** Tập id chốt của tệp xuất liệu trình một khách: khách thấy được theo CRM (ngoài scope → 404), rồi gói theo scope đơn — cùng PackagesRead. */
export async function packageExportIds(tx: TenantTx, authz: AuthzContext, i: { contactId: string; status?: string; cap: number }): Promise<string[]> {
  const { contact } = await visibleContact(tx, authz, i.contactId);
  return packageIds(tx, authz, { rootId: contact.id, status: i.status && STATUSES.has(i.status) ? i.status : undefined, cap: i.cap });
}

/** Dòng tệp theo lô id: chiếu lại dưới quyền HIỆN TẠI (khách CRM + đơn sales) — gói đã ra ngoài scope vắng mặt. */
export async function packageExportRows(tx: TenantTx, authz: AuthzContext, ids: readonly string[]) {
  const rows = await packagesById(tx, authz, ids);
  return rows.map((r) => ({ dto: toPackageDto(r), createdAt: r.created_at }));
}
