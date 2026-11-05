// TIP-032b P1: mock chính sách bán hàng đúng shape dùng chung với API thật (packages/shared/src/api/commerce-settings.ts) + luật như server —
// chỉ Chủ sở hữu đổi ngưỡng, CAS if_version; báo giá đọc ngưỡng cấu hình (q_2039 > 20M cần duyệt, nâng ngưỡng thì hết); một báo giá → một
// HĐ HOẶC một đơn (QUOTE_ALREADY_CONVERTED cả hai chiều).
import { beforeEach, describe, expect, it } from 'vitest';
import { salesPolicySchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createSettingsState, settingsHandlers } from './domains/settings';
import { createQuotesState } from './domains/quotes';
import { createContractsState } from './domains/contracts';
import { createOrdersState } from './domains/orders';
import { contractsHandlers } from './domains/contracts-actions';
import { ordersHandlers } from './domains/orders-actions';

const err = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string; fields?: Record<string, string> } }).error ?? { code: 'throw' };
  }
};
const reasons = async (id: string) => ((await mockTransport.get(`/quotes/${id}`)) as { approval_reasons: string[] }).approval_reasons;

describe('mock chính sách bán hàng + khoá chuyển đổi báo giá', () => {
  beforeEach(() => {
    const db = mockDb();
    db.settings = createSettingsState();
    db.quotes = createQuotesState();
    db.contracts = createContractsState();
    db.orders = createOrdersState();
    setMockRole('owner');
  });

  it('GET /settings/sales-policy đúng shape; mặc định 20M / 5%', async () => {
    const p = salesPolicySchema.parse(await mockTransport.get('/settings/sales-policy'));
    expect(p).toEqual({ approval_total_vnd: '20000000', approval_discount_pct: 5, agent_max_discount_pct: 5, version: 1, can_edit: true });
  });

  it('chỉ Chủ sở hữu đổi; version cũ → STALE_VERSION; nâng ngưỡng → báo giá hết lý do "total"', async () => {
    expect(await reasons('q_2039')).toContain('total');
    setMockRole('manager');
    expect((await err(() => settingsHandlers['sales_settings.update']!.execute(mockDb(), { if_version: 1, approval_total_vnd: '99000000' } as never)))?.code).toBe('FORBIDDEN');
    setMockRole('owner');
    expect((await err(() => settingsHandlers['sales_settings.update']!.execute(mockDb(), { if_version: 0, approval_total_vnd: '99000000' } as never)))?.code).toBe('STALE_VERSION');
    expect(settingsHandlers['sales_settings.update']!.execute(mockDb(), { if_version: 1, approval_total_vnd: '99000000' } as never)).toEqual({
      version: 2,
      approval_total_vnd: '99000000',
      approval_discount_pct: 5,
    });
    expect(await reasons('q_2039')).not.toContain('total');
  });

  it('một báo giá → một HĐ HOẶC một đơn — QUOTE_ALREADY_CONVERTED cả hai chiều', async () => {
    const db = mockDb();
    const q = db.quotes.quotes.find((x) => x.id === 'q_2041')!;
    q.status = 'accepted';
    const c = contractsHandlers['contract.create_from_quote']!.execute(db, { quote_id: q.id } as never) as { code: string };
    const e = await err(() => ordersHandlers['order.create_from_quote']!.execute(db, { quote_id: q.id } as never));
    expect(e).toMatchObject({ code: 'QUOTE_ALREADY_CONVERTED', fields: { quote_id: 'has_contract', code: c.code } });
    const q2 = db.quotes.quotes.find((x) => x.id === 'q_2040')!;
    q2.status = 'accepted';
    const o = ordersHandlers['order.create_from_quote']!.execute(db, { quote_id: q2.id } as never) as { code: string };
    expect(await err(() => contractsHandlers['contract.create_from_quote']!.execute(db, { quote_id: q2.id } as never))).toMatchObject({
      code: 'QUOTE_ALREADY_CONVERTED',
      fields: { quote_id: 'has_order', code: o.code },
    });
  });
});
