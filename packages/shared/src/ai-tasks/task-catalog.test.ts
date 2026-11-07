import { describe, expect, it } from 'vitest';
import { AI_TASK_TEMPLATE_DEFS, aiTaskAllows, aiTaskScopeModules } from './task-catalog';
import { isValidCron } from '../time/cron';

const a = (id: string, module: string, risk: string) => ({ id, module, risk });

describe('nhóm dữ liệu / công cụ của tác vụ', () => {
  it('đọc trong nhóm dữ liệu + đọc dùng chung; ngoài nhóm → không', () => {
    expect(aiTaskAllows(a('quote.create', 'sales', 'write'), ['customers'], ['read', 'write'])).toBe(false);
    expect(aiTaskAllows(a('appointment.list', 'booking', 'read'), ['customers'], ['read'])).toBe(true);
    expect(aiTaskAllows(a('product.search', 'catalog', 'read'), [], ['read'])).toBe(true);
    expect(aiTaskAllows(a('kb.search', 'ai', 'read'), [], [])).toBe(true);
  });

  it('ghi / gửi theo chip công cụ; email tách khỏi tin nhắn; money / delete / config không cấp', () => {
    expect(aiTaskAllows(a('contact.update', 'crm', 'write'), ['customers'], ['read'])).toBe(false);
    expect(aiTaskAllows(a('contact.update', 'crm', 'write'), ['customers'], ['write'])).toBe(true);
    expect(aiTaskAllows(a('message.send', 'inbox', 'send'), ['conversations'], ['message'])).toBe(true);
    expect(aiTaskAllows(a('contact.send_email', 'crm', 'send'), ['customers'], ['message'])).toBe(false);
    expect(aiTaskAllows(a('contact.send_email', 'crm', 'send'), ['customers'], ['email'])).toBe(true);
    expect(aiTaskAllows(a('payment.record', 'sales', 'money'), ['invoices'], ['read', 'write', 'message'])).toBe(false);
  });

  it('scope mở theo nhóm dữ liệu; mẫu chủ động có lịch hợp lệ', () => {
    expect([...aiTaskScopeModules(['customers', 'conversations'])].sort()).toEqual(['booking', 'crm', 'inbox', 'support']);
    expect(aiTaskScopeModules([]).size).toBe(0);
    for (const d of Object.values(AI_TASK_TEMPLATE_DEFS)) expect(isValidCron(d.cron)).toBe(true);
  });
});
