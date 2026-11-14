// TIP-033c §1 (unit): điều kiện đủ của gợi ý tạo đơn chỉ từ dữ kiện bền — xoá / đã có đơn / chưa xong / liệu trình / dịch vụ ngừng bán
// lần lượt chặn (thứ tự ưu tiên cố định); dữ kiện ràng xác nhận gồm version lịch + version / giá / thuế dịch vụ + khách gốc và thế hệ.
import { describe, expect, it, vi } from 'vitest';
import { factsOf, ineligible, type ServiceRow, type SuggestionSource } from '../src/booking/order-suggestions/authority';
import { appointmentOrderIssues } from '../src/ai/assistant/genui/appointment-order';

const a = (o: Partial<SuggestionSource> = {}): SuggestionSource => ({
  id: 'a1',
  code: 'LH-1',
  contactId: 'c1',
  ownerUserId: 'u1',
  teamId: null,
  serviceId: 's1',
  conversationId: null,
  status: 'done',
  packageId: null,
  orderId: null,
  deletedAt: null,
  version: 3,
  startAt: new Date(0),
  endAt: new Date(3_600_000),
  ...o,
});
const svc = (o: Partial<ServiceRow> = {}): ServiceRow => ({ id: 's1', name: 'Gội', price: 300000n, taxRate: 8, version: 2, status: 'active', deletedAt: null, ...o });

describe('ineligible', () => {
  it('lịch hoàn thành ngoài liệu trình, chưa có đơn, dịch vụ còn bán → đủ điều kiện', () => {
    expect(ineligible(a(), svc())).toBeNull();
  });
  it('mỗi dữ kiện bền chặn riêng, theo thứ tự xoá → đã có đơn → chưa xong → liệu trình → dịch vụ', () => {
    expect(ineligible(a({ deletedAt: new Date(), orderId: 'o' }), svc())).toBe('deleted');
    expect(ineligible(a({ orderId: 'o', status: 'pending' }), svc())).toBe('linked');
    expect(ineligible(a({ status: 'in_progress', packageId: 'p' }), svc())).toBe('not_done');
    expect(ineligible(a({ packageId: 'p' }), svc())).toBe('package');
    expect(ineligible(a(), svc({ status: 'archived' }))).toBe('service');
    expect(ineligible(a(), svc({ deletedAt: new Date() }))).toBe('service');
    expect(ineligible(a(), null)).toBe('service');
  });
});

describe('factsOf', () => {
  it('ràng version lịch, version / giá (chuỗi) / thuế dịch vụ, khách gốc + thế hệ vòng đời', () => {
    expect(factsOf(a(), svc(), { id: 'root', lifecycle: 4 })).toEqual({
      appointment_version: 3,
      service_id: 's1',
      service_version: 2,
      unit_price: '300000',
      tax_rate: 8,
      contact_root: 'root',
      contact_lifecycle: 4,
    });
  });
});

describe('appointmentOrderIssues (khối GenUI)', () => {
  const authz = { userId: 'u1', isOwner: true, permissions: new Set(), scope: {}, teamIds: [] } as never;
  const tree = (ids: string[]) => ({ version: 1 as const, root: { type: 'stack' as const, children: ids.map((id) => ({ type: 'appointment_order' as const, appointment_id: id })) } });
  it('mỗi khối kiểm qua bộ đọc gợi ý; id không còn thẻ → lỗi nêu đúng node', async () => {
    const check = vi.fn(async (_a: unknown, id: string) => id === 'ok');
    expect(await appointmentOrderIssues(check, authz, tree(['ok']))).toEqual([]);
    const issues = await appointmentOrderIssues(check, authz, tree(['ok', 'gone']));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/^node 1: appointment gone/);
  });
  it('không có bộ kiểm (thiếu DB) → từ chối khối, không dựng thẻ', async () => {
    expect(await appointmentOrderIssues(undefined, authz, tree(['ok']))).toHaveLength(1);
  });
});
