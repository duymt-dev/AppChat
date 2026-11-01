// TIP-024 AC1 (unit): cấu hình agent (từ khoá / khung giờ) qua store; giờ hành chính; system prompt có từ khoá + tính cách; trường
// sửa được của yêu cầu duyệt; tiêu đề nhật ký cho action duyệt.
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { blankConfig, columnsOf, hoursOf, merge } from '../src/ai/agents/agent.store';
import { agentSystem, withinHours } from '../src/ai/agents/agent.runtime';
import { editableFields } from '../src/ai/approvals/approvals.read';
import { confirmCard } from '../src/ai/assistant/card';

const def = (id: string) => registry.find((a) => a.id === id)!;

describe('cấu hình agent', () => {
  it('từ khoá bỏ trống / trùng; khung giờ vào jsonb { mode }; giá trị lạ → luôn hoạt động', () => {
    const c = merge(blankConfig('A'), { keywords: [' bảo hành ', 'bảo hành', ''], working_hours: 'office' });
    expect(columnsOf(c)).toMatchObject({ keywords: ['bảo hành'], workingHours: { mode: 'office' } });
    expect(hoursOf({ mode: 'office' })).toBe('office');
    expect(hoursOf({ mode: 'night' })).toBe('always');
    expect(hoursOf(null)).toBe('always');
  });

  it('giờ hành chính 8:00–17:30 giờ VN, mọi ngày', () => {
    expect(withinHours('office', new Date('2026-11-01T01:00:00Z'))).toBe(true);
    expect(withinHours('office', new Date('2026-11-01T10:30:00Z'))).toBe(false);
    expect(withinHours('office', new Date('2026-11-01T17:00:00Z'))).toBe(false);
    expect(withinHours('always', new Date('2026-11-01T17:00:00Z'))).toBe(true);
  });

  it('system prompt có từ khoá ưu tiên + tính cách', () => {
    const s = agentSystem(merge(blankConfig('CSKH'), { keywords: ['bảo hành', 'khiếu nại'], persona: 'Thân thiện' }));
    expect(s).toContain('Ưu tiên tin nhắn có từ khoá: bảo hành, khiếu nại');
    expect(s).toContain('Tính cách: Thân thiện');
    expect(agentSystem(blankConfig('X'))).not.toContain('Ưu tiên tin nhắn');
  });
});

describe('Chờ duyệt + nhật ký', () => {
  it('trường sửa được = trường vô hướng cấp 1 của input schema action gốc', () => {
    expect(editableFields(def('invoice.send_payment_qr'))).toEqual([
      { key: 'invoice_id', type: 'string', required: true },
      { key: 'channel', type: 'string', required: true },
    ]);
    expect(editableFields(undefined)).toEqual([]);
  });

  it('tiêu đề nhật ký theo động từ riêng của action duyệt', () => {
    expect(confirmCard(def('approval.edit_and_approve'), null, '').title).toBe('Sửa & duyệt yêu cầu');
    expect(confirmCard(def('approval.reject'), null, '', 'en').title).toBe('Reject request');
  });
});
