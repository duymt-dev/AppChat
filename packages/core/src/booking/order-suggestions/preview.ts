// Nguồn chuyển đổi lịch hẹn → đơn (TIP-033c §3): một bộ kiểm dùng chung cho xem trước và thực thi `order.create_from_appointment` — lịch
// sống trong scope sales GHI (lạ / ngoài scope / khách gốc đã xoá → 404 đồng nhất), đã có đơn → `linked`, chưa hoàn thành / thuộc liệu trình /
// dịch vụ ngừng bán → 409. Dữ kiện ràng (factsOf) đọc cùng lúc để xác nhận so lại. Không khoá: thực thi khoá trước rồi mới gọi.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { POLICIES, allows } from '../../authz/data-access';
import { UUID } from '../booking-access';
import { factsOf, liveRoot, type ServiceRow, type SuggestionSource } from './authority';

export type ConversionSource =
  | { kind: 'linked'; appointment: SuggestionSource; orderId: string }
  | { kind: 'new'; appointment: SuggestionSource; service: ServiceRow; root: { id: string; lifecycle: number }; facts: Record<string, string | number> };

const NF = () => new AppError('NOT_FOUND', 404, { appointment_id: 'not_found' });

export async function conversionSource(tx: TenantTx, authz: AuthzContext, id: string): Promise<ConversionSource> {
  const a = UUID.test(id) ? await tx.appointment.findUnique({ where: { id } }) : null;
  if (!a || a.deletedAt || !(await allows(tx, authz, POLICIES.sales, 'write', { owner: a.ownerUserId, team: a.teamId, contact: a.contactId }))) throw NF();
  if (a.orderId) return { kind: 'linked', appointment: a, orderId: a.orderId };
  if (a.status !== 'done') throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
  if (a.packageId) throw new AppError('INVALID_STATE', 409, { appointment_id: 'package' });
  const root = await liveRoot(tx, a.contactId);
  if (!root) throw NF();
  const service = await tx.product.findUnique({ where: { id: a.serviceId }, select: { id: true, name: true, price: true, taxRate: true, version: true, status: true, deletedAt: true } });
  if (!service || service.deletedAt || service.status !== 'active') throw new AppError('INVALID_STATE', 409, { service_id: 'unavailable' });
  return { kind: 'new', appointment: a, service, root, facts: factsOf(a, service, root) };
}
