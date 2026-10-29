import { describe, expect, it } from 'vitest';
import { activeRailKey, CRM_ITEMS, RAIL_ITEMS, routePermission } from './nav-config';

describe('nav-config', () => {
  it('rail theo thứ tự prototype, không có module ẩn (D07, D19)', () => {
    expect(RAIL_ITEMS.map((i) => i.key)).toEqual([
      'dashboard', 'assistant', 'inbox', 'customers', 'tickets', 'marketing', 'calendar', 'agents',
    ]);
  });

  it('nhóm CRM sáng mục Khách hàng', () => {
    for (const i of CRM_ITEMS) expect(activeRailKey(`${i.route}/x`)).toBe('customers');
    expect(activeRailKey('/inbox/123')).toBe('inbox');
    expect(activeRailKey('/settings/general')).toBeNull();
  });

  it('quyền xem theo route module (Blueprint §3.5)', () => {
    expect(routePermission('/inbox/c1')).toBe('inbox.view');
    expect(routePermission('/agents/new')).toBe('agents.manage');
    expect(routePermission('/invoices')).toBe('invoice.manage');
    expect(routePermission('/dashboard')).toBeUndefined();
    expect(routePermission('/settings/billing')).toBeUndefined();
  });
});
