// TIP-034b §1.3: hợp đồng 3 action từ điển gợi ý danh mục — quyền / risk / cấp agent / undo / xin xem trước; input thay cả bộ bắt buộc
// `if_version`; output có version + nhãn + mặc định. Validator nhãn ở shared (category-config.test.ts) — zod chỉ chặn kích thước thô.
import { describe, expect, it } from 'vitest';
import { REQUESTABLE_PREVIEW_ACTIONS, getAction, registry, ticketCategoriesGet, ticketCategoriesReplace, ticketCategorySuggestions } from '../src';

describe('support-categories actions', () => {
  it('đăng ký đúng một lần; quyền / risk / cấp agent theo TIP', () => {
    for (const id of ['ticket_categories.get', 'ticket_categories.replace', 'ticket.category_suggestions']) expect(registry.filter((a) => a.id === id)).toHaveLength(1);
    expect(getAction('ticket_categories.replace')).toBe(ticketCategoriesReplace);
    expect(ticketCategoriesGet).toMatchObject({ permission: 'settings.manage', risk: 'read', agentGrantable: false });
    expect(ticketCategoriesReplace).toMatchObject({ permission: 'settings.manage', risk: 'config', agentGrantable: false, undo: { windowSec: 86_400 } });
    expect(ticketCategorySuggestions).toMatchObject({ permission: 'ticket.view', risk: 'read', agentGrantable: true, skill: true });
  });

  it('UI xin xem trước khi thay bộ (preview trước / sau + cảnh báo)', () => {
    expect(REQUESTABLE_PREVIEW_ACTIONS.has('ticket_categories.replace')).toBe(true);
  });

  it('replace: if_version bắt buộc, số nguyên ≥ 0; nhãn là chuỗi', () => {
    const p = (v: unknown) => ticketCategoriesReplace.input.safeParse(v).success;
    expect(p({ labels: ['Hoàn tiền'], if_version: 0 })).toBe(true);
    expect(p({ labels: ['Hoàn tiền'] })).toBe(false);
    expect(p({ labels: ['Hoàn tiền'], if_version: -1 })).toBe(false);
    expect(p({ labels: ['Hoàn tiền'], if_version: 1.5 })).toBe(false);
    expect(p({ labels: [1], if_version: 0 })).toBe(false);
    expect(p({ labels: Array.from({ length: 201 }, (_, i) => `n${i}`), if_version: 0 })).toBe(false);
  });

  it('output: version + nhãn + mặc định; gợi ý có used + next_cursor', () => {
    expect(ticketCategoriesReplace.output.safeParse({ version: 2, labels: ['A'], default: 'A' }).success).toBe(true);
    expect(ticketCategoriesReplace.output.safeParse({ version: 2, labels: ['A'] }).success).toBe(false);
    expect(ticketCategorySuggestions.output.safeParse({ config: { version: 0, labels: ['A'], default: 'A' }, used: ['B'], next_cursor: null }).success).toBe(true);
    expect(ticketCategorySuggestions.input.safeParse({ cursor: 'x'.repeat(401) }).success).toBe(false);
  });

  it('mô tả cho model có ví dụ kèm if_version', () => {
    expect(ticketCategoriesReplace.description).toContain('"if_version"');
  });
});
