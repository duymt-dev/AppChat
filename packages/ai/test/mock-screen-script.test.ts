// Model giả `AI_ENGINE=mock` cho Trợ lý theo màn (TIP-023c AC4 — E2E http): chỉ dùng id có trong dòng ngữ cảnh server đã lọc theo quyền;
// gắn thẻ dòng chọn = lần lượt mỗi khách một lời gọi; Phân tích nhanh → tìm rồi render `$ref` bước tìm.
import { describe, expect, it } from 'vitest';
import { echoScript, type MockCtx } from '../src';

const SYS = '# TRỢ LÝ APPCHAT\n- route: /customers\n- contact: c1\n- selection: c1, c2, c3';
const turn = (lastUser: string, extra: Partial<MockCtx> = {}) => (echoScript as (c: MockCtx) => unknown)({ lastUser, call: 0, system: SYS, lastTool: null, toolResults: 0, ...extra });

describe('mock Trợ lý theo màn', () => {
  it('gắn thẻ các khách đang chọn → mỗi lượt một contact.tag theo thứ tự, hết dòng → câu chốt', () => {
    const say = 'gắn thẻ VIP cho các khách đang chọn';
    expect(turn(say)).toEqual({ tool: 'call_action', input: { action_id: 'contact.tag', input: { contact_id: 'c1', tag: 'VIP', op: 'add' } } });
    expect(turn(say, { lastTool: { tool: 'call_action', output: { tags: ['VIP'] } }, toolResults: 2 })).toMatchObject({ input: { input: { contact_id: 'c3' } } });
    expect(turn(say, { lastTool: { tool: 'call_action', output: {} }, toolResults: 3 })).toEqual({ text: 'Đã xử lý 3 khách đang chọn.' });
    expect(turn(say, { system: '# TRỢ LÝ APPCHAT\n- route: /customers' })).toEqual({ text: 'Anh/chị chọn khách trên bảng trước nhé.' });
  });

  it('báo giá này còn hiệu lực → quote.get id ngữ cảnh → trả lời theo bản ghi', () => {
    const sys = '# TRỢ LÝ APPCHAT\n- route: /quotes\n- quote: q_9';
    expect(turn('báo giá này còn hiệu lực không?', { system: sys })).toEqual({ tool: 'call_action', input: { action_id: 'quote.get', input: { quote_id: 'q_9' } } });
    expect(turn('báo giá này còn hiệu lực không?', { system: sys, lastTool: { tool: 'call_action', output: { code: 'BG-1001', status: 'draft', valid_until: null } } })).toEqual({ text: 'Báo giá BG-1001 chưa gửi nên chưa tính hiệu lực (trạng thái: draft).' });
  });

  it('Phân tích pipeline → contact.search → render bảng $ref step:1; render bị từ chối → bước hợp lệ server báo', () => {
    const say = 'Phân tích pipeline khách hàng theo giai đoạn';
    expect(turn(say)).toMatchObject({ tool: 'call_action', input: { action_id: 'contact.search' } });
    expect(JSON.stringify(turn(say, { lastTool: { tool: 'call_action', output: { contacts: [], total: 0 } } }))).toContain('step:1.contacts');
    const retry = turn(say, { lastTool: { tool: 'render', output: { error: { message: 'render rejected — fix and call render again: $ref step:1.total: step 1 is not … (valid: 3)' } } } });
    expect(JSON.stringify(retry)).toContain('step:3.contacts');
  });
});
