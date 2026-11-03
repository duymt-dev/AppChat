// Mock GenUI theo màn (TIP-023c G2): drawer gửi route → cây của module; không khớp → cây chung / câu trả lời mẫu. Mỗi module ≥ 3 cây hợp lệ.
import { describe, expect, it } from 'vitest';
import { checkTree, refsOf, type UiTree } from '@appchat/shared';
import customers from '../../../../../../../fixtures/prototype-parity/customers.json';
import { BY_MODULE, genUiReply } from './assistant-genui';

describe('mock genui theo màn', () => {
  it.each(Object.keys(BY_MODULE))('%s: ≥ 3 cây hợp lệ, mọi $ref có trong refs', (m) => {
    const list = BY_MODULE[m]!;
    expect(list.length).toBeGreaterThanOrEqual(3);
    for (const g of list) {
      const c = checkTree(g.tree);
      expect(c.ok, `${m}: ${JSON.stringify(c)}`).toBe(true);
      for (const r of refsOf((g.tree as UiTree).root)) expect(Object.keys(g.refs as object)).toContain(r.split('.')[0]);
    }
  });

  it.each(Object.keys(BY_MODULE).filter((m) => m !== 'customers'))('%s: prompt nút nhanh của drawer khớp một cây của màn', async (m) => {
    const vi = (await import(`../../../../../messages/vi/${m}.json`)) as { aiPanel: { prompts?: Record<string, string> } };
    const prompts = Object.values(vi.aiPanel.prompts ?? {});
    const hits = prompts.filter((p) => genUiReply(p.toLowerCase(), `/${m}`));
    expect(hits.length).toBeGreaterThanOrEqual(Math.min(prompts.length, 2));
  });

  it('route /customers → cây của module; route khác → không lấy cây customers (module không có cây → cây chung / null)', () => {
    const hit = genUiReply('phân tích pipeline khách hàng theo giai đoạn', '/customers?layout=list');
    expect(hit?.[0]).toMatchObject({ type: 'delta', text: customers.genui[0]!.lead });
    expect(genUiReply('phân tích pipeline khách hàng theo giai đoạn', '/inbox')).toBeNull();
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
