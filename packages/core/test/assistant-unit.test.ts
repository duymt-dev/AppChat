// TIP-023 AC2 (unit): find_actions lọc quyền + chế độ, tìm không dấu; thẻ xác nhận từ ActionDef (route / màu / icon theo đối tượng,
// tiêu đề theo động từ, mô tả = preview hoặc câu mặc định); UiCommand (zod); system prompt có quyền + màn hiện tại + chế độ; nhóm
// nhật ký; executor không còn PREVIEW_REQUIRED (handler thiếu preview → bản tối thiểu).
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { authzForRole, uiCommandSchema } from '@appchat/shared';
import { allowedFor, briefSchema, findActions, modeAllows } from '../src/ai/assistant/catalog';

// Mọi action coi như đã có handler — lọc "chưa cài" kiểm ở assistant-implemented-tools.test.ts.
const find = (...a: Parameters<typeof findActions>) => findActions(a[0], a[1], a[2], a[3], a[4], () => true);
import { confirmCard, lookOf } from '../src/ai/assistant/card';
import { assistantSystem, contextLine } from '../src/ai/assistant/assistant-prompt';
import { kindOf } from '../src/ai/assistant/action-logs.read';

const def = (id: string) => registry.find((a) => a.id === id)!;
const owner = authzForRole('owner', 'u1');
const sales = authzForRole('sales', 'u2');
const noAgents = { aiAgent: { findMany: async () => [] } } as never;

describe('find_actions', () => {
  it('không dấu: "bao gia" → chỉ quote.*; "khach hang" → contact.*; tiếng Anh "quote" cũng được', () => {
    const q = find(owner, 'cowork', 'bao gia');
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((a) => a.id.startsWith('quote.'))).toBe(true);
    expect(find(owner, 'cowork', 'Khách Hàng').every((a) => a.id.startsWith('contact.'))).toBe(true);
    expect(find(owner, 'cowork', 'quote', undefined, 50).map((a) => a.id)).toContain('quote.create');
  });

  it('động từ tiếng Việt: "tạo khách hàng" → contact.create; "sửa khách hàng" → contact.update; "tìm khách" (Chat) → contact.search', () => {
    expect(find(owner, 'cowork', 'tạo khách hàng').map((a) => a.id)).toEqual(['contact.create']);
    expect(find(owner, 'cowork', 'sửa khách hàng').map((a) => a.id)).toContain('contact.update');
    expect(find(owner, 'chat', 'tìm khách hàng').map((a) => a.id)).toEqual(['contact.search']);
  });

  it('Chat chỉ action read; Cowork có ghi', () => {
    const chat = find(owner, 'chat', 'ticket');
    expect(chat.map((a) => a.id)).toEqual(expect.arrayContaining(['ticket.search', 'ticket.get']));
    expect(chat.every((a) => a.risk === 'read')).toBe(true);
    expect(find(owner, 'cowork', 'ticket', undefined, 50).map((a) => a.id)).toContain('ticket.create');
    expect(modeAllows(def('contact.create'), 'chat')).toBe(false);
    expect(modeAllows(def('kb.search'), 'chat')).toBe(true);
  });

  it('quyền: sales không thấy agent.* / member.*; mọi người không thấy admin / approval / billing / workspace.switch', () => {
    expect(find(sales, 'cowork', 'agent', undefined, 50).filter((a) => a.id.startsWith('agent.'))).toEqual([]);
    expect(allowedFor(def('member.invite'), sales)).toBe(false);
    expect(allowedFor(def('quote.create'), sales)).toBe(true);
    for (const id of ['approval.approve', 'billing.create_invoice', 'workspace.switch', 'admin.invoice.confirm_transfer']) expect(allowedFor(def(id), owner), id).toBe(false);
  });

  it('lọc module + giới hạn; input schema rút gọn có trường bắt buộc / tuỳ chọn', () => {
    expect(find(owner, 'cowork', '', 'support', 3)).toHaveLength(3);
    expect(find(owner, 'cowork', '', 'support', 50).every((a) => a.module === 'support')).toBe(true);
    expect(briefSchema(def('kb.search'))).toEqual({ query: 'string', 'limit?': 'integer(1..10)' });
  });
});

describe('thẻ xác nhận', () => {
  it('route / màu / icon theo đối tượng (đúng prototype intents), tiêu đề theo động từ, nơi lưu = module', () => {
    expect(confirmCard(def('quote.create'), null, 'tk')).toMatchObject({ type: 'confirm', confirm_token: 'tk', key: 'quote.create', route: '/quotes', color: '#C9820B', icon: 'ic-doc', title: 'Tạo báo giá', dest: 'Bán hàng' });
    expect(confirmCard(def('agent.create_and_publish'), null, 'tk')).toMatchObject({ route: '/agents', color: '#0E9B7E', icon: 'ic-spark', title: 'Tạo AI Agent' });
    expect(confirmCard(def('ticket.create'), null, 'tk')).toMatchObject({ route: '/tickets', icon: 'ic-ticket', title: 'Tạo ticket', dest: 'Hỗ trợ' });
    expect(confirmCard(def('contact.delete'), null, 'tk').title).toBe('Xoá khách hàng');
    expect(confirmCard(def('quote.send'), null, 'tk', 'en').title).toBe('Send quote');
    expect(lookOf({ id: 'xyz.do', module: 'settings' })).toMatchObject({ route: '/settings' });
  });

  it('mô tả = tóm tắt preview của handler; không có → câu mặc định theo tiêu đề, không lộ id action (DC-128, DC-133)', () => {
    expect(confirmCard(def('contact.create'), { summary: 'Tạo khách Lan', risk: 'write' }, 'tk').desc).toBe('Tạo khách Lan');
    expect(confirmCard(def('contact.create'), { summary: '', risk: 'write' }, 'tk').desc).toBe('AppChat sẽ tạo khách hàng khi anh/chị bấm Xác nhận.');
    expect(confirmCard(def('quote.send'), null, 'tk', 'en').desc).toBe('AppChat will send quote once you press Confirm.');
  });
});

describe('UiCommand + prompt + nhật ký', () => {
  it('UiCommand: hợp lệ qua, sai loại / route không bắt đầu bằng / bị chặn', () => {
    expect(uiCommandSchema.safeParse({ type: 'navigate', route: '/tickets' }).success).toBe(true);
    expect(uiCommandSchema.safeParse({ type: 'open', entity: 'contact', id: 'c1', view: 'drawer' }).success).toBe(true);
    expect(uiCommandSchema.safeParse({ type: 'navigate', route: 'https://evil.vn' }).success).toBe(false);
    expect(uiCommandSchema.safeParse({ type: 'boom' }).success).toBe(false);
  });

  it('system prompt: prompt `assistant` có version, quyền người dùng, màn hiện tại + bản ghi, chế độ; en theo locale', async () => {
    const vi = await assistantSystem(noAgents, { text: 'x', mode: 'chat', session_id: 's', locale: 'vi', user_name: 'Lan', role: 'sales', context: { route: '/quotes', entity: 'quote', id: 'q1' } }, sales);
    expect(vi).toMatch(/^# TRỢ LÝ APPCHAT/);
    expect(vi).toContain('làm việc cho Lan (vai trò: sales)');
    expect(vi).toContain('quote.create');
    expect(vi).toContain('- route: /quotes\n- quote: q1');
    expect(vi).toContain('Chat — chỉ tra cứu');
    expect(vi).toContain('Chưa có agent nào đang chạy.');
    expect(vi).toContain('Không nêu mã lỗi, id hay tên kỹ thuật');
    const en = await assistantSystem(noAgents, { text: 'x', mode: 'cowork', session_id: 's', locale: 'en', user_name: 'Lan', role: 'owner' }, owner);
    expect(en).toMatch(/^# APPCHAT ASSISTANT/);
    expect(en).toContain('Workspace owner (full access)');
    expect(contextLine(undefined, [{ id: 'f1', name: 'bang-gia.pdf' }], '-')).toBe('- attachments: bang-gia.pdf [file_id: f1]');
  });

  it('nhóm nhật ký theo action / risk', () => {
    expect(kindOf('contact.create', 'write')).toBe('create');
    expect(kindOf('agent.create_and_publish', 'config')).toBe('create');
    expect(kindOf('quote.send', 'send')).toBe('send');
    expect(kindOf('contact.delete', 'delete')).toBe('delete');
    expect(kindOf('contact.export', 'read')).toBe('export');
    expect(kindOf('contact.update', 'write')).toBe('update');
  });
});
