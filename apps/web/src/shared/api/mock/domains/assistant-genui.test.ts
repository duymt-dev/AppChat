// Mock GenUI theo màn (TIP-023c G2): drawer gửi route → cây của module; không khớp → cây chung / câu trả lời mẫu. Mỗi module ≥ 3 cây hợp lệ.
import { describe, expect, it } from 'vitest';
import { checkTree, refsOf, type UiTree } from '@appchat/shared';
import customers from '../../../../../../../fixtures/prototype-parity/customers.json';
import { genUiReply } from './assistant-genui';

describe('mock genui theo màn', () => {
  it('customers: ≥ 3 cây hợp lệ, mọi $ref có trong refs', () => {
    expect(customers.genui.length).toBeGreaterThanOrEqual(3);
    for (const g of customers.genui) {
      const c = checkTree(g.tree);
      expect(c.ok, JSON.stringify(c)).toBe(true);
      for (const r of refsOf((g.tree as UiTree).root)) expect(Object.keys(g.refs)).toContain(r.split('.')[0]);
    }
  });

  it('route /customers → cây của module; route khác → không lấy cây customers', () => {
    const hit = genUiReply('phân tích pipeline khách hàng theo giai đoạn', '/customers?layout=list');
    expect(hit?.[0]).toMatchObject({ type: 'delta', text: customers.genui[0]!.lead });
    expect(genUiReply('phân tích pipeline khách hàng theo giai đoạn', '/quotes')).toBeNull();
    const dedupe = genUiReply('rà soát khách hàng trùng lặp', '/customers')?.[1] as { intents: Record<string, string> };
    expect(Object.keys(dedupe.intents)).toEqual(['1']);
  });
});

describe('mock phiên Trợ lý', () => {
  it('lượt drawer ghi vào phiên; mở lại phiên trả đủ tin (chữ + cây) không gọi lại model', async () => {
    const { mockTransport } = await import('../mock-transport');
    const turn = await mockTransport.post<{ session_id: string }>('/assistant/messages', { text: 'Tìm khách có nguy cơ rời bỏ', mode: 'cowork', context: { route: '/customers', surface: 'drawer' } });
    const msgs = await mockTransport.get<{ data: { role: string; text: string; ui?: unknown }[] }>(`/assistant/sessions/${turn.session_id}/messages`);
    expect(msgs.data.map((m) => [m.role, !!m.ui])).toEqual([['user', false], ['ai', false], ['ai', true]]);
    const list = await mockTransport.get<{ data: { id: string }[] }>('/assistant/sessions', { q: 'rời bỏ' });
    expect(list.data[0]!.id).toBe(turn.session_id);
  });
});
