// TIP-019c §1.1: 4 kỹ năng tiện ích chỉ đọc trong registry — module ai, risk read, skill, cấp được cho agent, quyền assistant.use (không
// thêm quyền mới / không đổi vai trò mặc định), không invalidates / undo; mô tả tiếng Anh có ví dụ và nói rõ không ghi nghiệp vụ.
import { describe, expect, it } from 'vitest';
import { UTILITY_ACTIONS } from '@appchat/shared';
import { registry } from '../src';

const defs = UTILITY_ACTIONS.map((id) => registry.find((a) => a.id === id));

describe('kỹ năng tiện ích AI', () => {
  it('đủ 4 action, đúng hợp đồng chỉ đọc', () => {
    for (const a of defs) {
      expect(a, 'registered').toBeDefined();
      expect(a).toMatchObject({ module: 'ai', risk: 'read', skill: true, agentGrantable: true, permission: 'assistant.use', invalidates: [] });
      expect(a!.undo).toBeUndefined();
      expect(a!.description).toMatch(/Example: \{/);
      expect(a!.title).toBe(`actions.${a!.id}.title`);
    }
  });

  it('mô tả nói rõ không ghi / không tự hành động', () => {
    const text = defs.map((a) => a!.description).join(' ');
    expect(text).toMatch(/never saved to CRM/);
    expect(text).toMatch(/Never routes/);
    expect(text).toMatch(/Never writes/);
    expect(text).toMatch(/never changes the contact score/);
  });
});
