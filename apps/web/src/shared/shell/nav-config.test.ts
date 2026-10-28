import { describe, expect, it } from 'vitest';
import { activeRailKey, CRM_ITEMS, RAIL_ITEMS } from './nav-config';

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
});
