// TIP-022c §4.2, §3.7–3.8 (unit, DB giả): quyền riêng tư + công bố của câu bán hàng — biên nhận / căn cứ vào kiểm kê "Quên khách" của
// domain ai (biên nhận theo khách gốc, căn cứ theo hội thoại của khách), erase vô hiệu + bỏ liên kết riêng (giữ khoá nguồn chống phát lại);
// căn cứ công bố so sự thật HIỂN THỊ (kết luận / giá / tên / thay thế nêu ra) — số tồn đổi mà câu không đổi vẫn gửi; giá / kết luận đổi, chữ
// khác câu đã dựng, agent mất grant, khách bị quên, căn cứ đã vô hiệu → không gửi; người gửi kiểm dưới quyền chính họ; lời chào bỏ qua.
// Hàng rào nguồn: khoá khách → hội thoại → tin (id tăng dần) → vô hiệu biên nhận prepared theo tin; xoá lịch sử vô hiệu cả hội thoại.
import { afterEach, describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { aiInventory } from '../src/ai/privacy/inventory';
import { eraseAiArtifact } from '../src/ai/privacy/cleanup';
import { checkPublication, contentDigest, dispatchSalesReason, visibleDigests } from '../src/ai/sales-behavior/publication';
import { fenceCustomerSource } from '../src/inbox/services/customer-source-fence';
import { registerStockObserver, type StockObservation } from '../src/kernel/actions/sales-publication';

const NOW = new Date('2026-11-13T03:00:00Z');
const sqlOf = (q: TemplateStringsArray | { strings?: readonly string[] }) => (Array.isArray(q) ? (q as TemplateStringsArray).join('?') : ((q as { strings?: readonly string[] }).strings ?? []).join('?'));
const obs = (productId: string, o: Partial<StockObservation> = {}): StockObservation => ({ productId, code: productId.toUpperCase(), name: `SP ${productId}`, type: 'physical', unit: 'hộp', price: '250000', qty: 2, claim: 'available_now', stock: 7, ...o });

/** Bộ quan sát giả (catalog thật ở integration): trả theo bảng `stock`. */
let stock: Record<string, Partial<StockObservation>> = {};
registerStockObserver(async (_tx, reqs, now) => ({ items: reqs.map((r) => obs(r.productId, { qty: r.qty, ...stock[r.productId] })), checkedAt: now.toISOString(), digest: 'd' }));
afterEach(() => void (stock = {}));

/** Transaction giả cho kiểm căn cứ: một dòng `ai_sales_publication`, hội thoại + khách, agent đã xuất bản, hàng rào quên khách. */
function pubTx(row: Record<string, unknown> | null, o: { fenced?: boolean; agentTools?: string[] | null } = {}) {
  const queries: string[] = [];
  const tx = {
    $queryRaw: async (q: TemplateStringsArray) => {
      const s = sqlOf(q);
      queries.push(s);
      if (s.includes('FROM ai_sales_publication')) return row ? [row] : [];
      if (s.includes('privacy_family_member')) return [{ x: !!o.fenced }];
      return [];
    },
    conversation: { findUnique: async () => ({ contactId: 'k1' }) },
    aiAgent: { findUnique: async () => (o.agentTools === null ? null : { id: 'ag1', name: 'Sales', status: 'active', deletedAt: null, publishedVersion: 1 }) },
    aiAgentVersion: { findUnique: async () => ({ version: 1, config: { tools: o.agentTools ?? ['product.get', 'stock.get'] } }) },
  };
  return { tx: tx as never, queries };
}
const TEXT = 'SP p1: còn hàng cho 2 hộp (kiểm lúc 10:00) — giá 250.000₫/hộp.';
const row = (o: Record<string, unknown> = {}) => {
  const v = visibleDigests([obs('p1')], null);
  return { conversation_id: 'c1', agent_id: 'ag1', items: [{ product_id: 'p1', qty: 2 }], alternatives: [], observation_digest: v.items, alternatives_digest: v.alternatives, content_digest: contentDigest(TEXT), state: 'active', ...o };
};

describe('căn cứ công bố — sự thật hiển thị', () => {
  it('số tồn đổi mà kết luận / giá giữ → vẫn gửi (câu không nêu số tồn, giờ kiểm không tính)', async () => {
    stock = { p1: { stock: 3 } };
    expect(await checkPublication(pubTx(row()).tx, 'r1', { now: NOW })).toBe('ok');
  });

  it('kết luận / giá / tên đổi → stock_changed; không có dòng → ok (tin không phải câu bán hàng)', async () => {
    for (const s of [{ claim: 'shortage' as const, stock: 1 }, { price: '300000' }, { name: 'Tên mới' }]) {
      stock = { p1: s };
      expect(await checkPublication(pubTx(row()).tx, 'r1', { now: NOW })).toBe('stock_changed');
    }
    expect(await checkPublication(pubTx(null).tx, 'r1', { now: NOW })).toBe('ok');
    expect(await checkPublication(pubTx(row()).tx, null, { now: NOW })).toBe('ok');
  });

  it('thay thế: chỉ thay thế được NÊU tính — hết hàng thay thế đã nêu → stock_changed', async () => {
    stock = { p1: { claim: 'shortage', stock: 0 } };
    const req = [obs('p1', { claim: 'shortage', stock: 0 })];
    const v = visibleDigests(req, [obs('p2', { qty: 2 })]);
    const r = row({ alternatives: [{ product_id: 'p2', qty: 2 }], observation_digest: v.items, alternatives_digest: v.alternatives });
    expect(await checkPublication(pubTx(r).tx, 'r1', { now: NOW })).toBe('ok');
    stock = { p1: { claim: 'shortage', stock: 0 }, p2: { claim: 'shortage', stock: 0 } };
    expect(await checkPublication(pubTx(r).tx, 'r1', { now: NOW })).toBe('stock_changed');
  });

  it('khách bị quên / căn cứ đã vô hiệu → invalidated (trước mọi đọc tồn)', async () => {
    expect(await checkPublication(pubTx(row(), { fenced: true }).tx, 'r1', { now: NOW })).toBe('invalidated');
    expect(await checkPublication(pubTx(row({ state: 'invalidated' })).tx, 'r1', { now: NOW })).toBe('invalidated');
  });

  it('người gửi: quyền CHÍNH họ — không catalog.view → stock_unverified; có → ok', async () => {
    const noCatalog = { ...authzForRole('owner', 'u1'), isOwner: false, permissions: new Set(['inbox.reply']) } as never;
    expect(await checkPublication(pubTx(row()).tx, 'r1', { now: NOW, authz: noCatalog })).toBe('stock_unverified');
    expect(await checkPublication(pubTx(row()).tx, 'r1', { now: NOW, authz: authzForRole('sales', 'u1') })).toBe('ok');
  });
});

describe('đặt chỗ gửi (send-fence)', () => {
  const ob = (o: Record<string, unknown> = {}) => ({ knowledgeRunId: 'r1', turnFence: 3, payload: { text: TEXT }, ...o });

  it('tin agent: đúng câu + grant hiện hành → null; chữ khác → sales_content_changed; agent mất grant / tạm dừng → sales_stock_unverified', async () => {
    expect(await dispatchSalesReason(pubTx(row()).tx, ob(), null, NOW)).toBeNull();
    expect(await dispatchSalesReason(pubTx(row()).tx, ob({ payload: { text: 'Dạ còn nhiều lắm ạ' } }), null, NOW)).toBe('sales_content_changed');
    expect(await dispatchSalesReason(pubTx(row(), { agentTools: ['quote.get'] }).tx, ob(), null, NOW)).toBe('sales_stock_unverified');
    expect(await dispatchSalesReason(pubTx(row(), { agentTools: null }).tx, ob(), null, NOW)).toBe('sales_stock_unverified');
  });

  it('tồn đổi sau khi ghi tin → sales_stock_changed; tin người (không fence) chỉ so sự thật, không so chữ', async () => {
    stock = { p1: { claim: 'shortage', stock: 1 } };
    expect(await dispatchSalesReason(pubTx(row()).tx, ob(), null, NOW)).toBe('sales_stock_changed');
    stock = {};
    expect(await dispatchSalesReason(pubTx(row()).tx, ob({ turnFence: null, payload: { text: 'Người sửa chữ' } }), null, NOW)).toBeNull();
  });

  it('lời chào / không run → bỏ qua', async () => {
    const { tx, queries } = pubTx(row());
    expect(await dispatchSalesReason(tx, ob(), 'greeting', NOW)).toBeNull();
    expect(await dispatchSalesReason(tx, ob({ knowledgeRunId: null }), null, NOW)).toBeNull();
    expect(queries).toEqual([]);
  });
});

describe('quyền riêng tư (adapter ai)', () => {
  it('kiểm kê: biên nhận theo khách gốc (exclusive), căn cứ theo hội thoại của khách', async () => {
    let sql = '';
    const tx = { $queryRaw: async (q: TemplateStringsArray) => ((sql = sqlOf(q)), [{ kind: 'ai_sales_intent', record_id: 's1', revision: 1, ownership: 'exclusive' }, { kind: 'ai_sales_publication', record_id: 'p1', revision: 1, ownership: 'shared' }]) };
    const inv = await aiInventory(tx as never, ['k1']);
    expect(inv.map((a) => [a.kind, a.recordId, a.ownership])).toEqual([['ai_sales_intent', 's1', 'exclusive'], ['ai_sales_publication', 'p1', 'shared']]);
    expect(sql).toContain('FROM ai_sales_intent s WHERE s.original_contact_id = ANY(');
    expect(sql).toMatch(/FROM ai_sales_publication p JOIN conversation c ON c.id = p.conversation_id\s+WHERE c.contact_id = ANY\(/);
  });

  it('erase biên nhận: prepared → invalidated/privacy_erased, xoá liên kết riêng, GIỮ khoá nguồn; erase căn cứ: vô hiệu + bỏ danh sách sản phẩm', async () => {
    const sql: string[] = [];
    const tx = { $executeRaw: async (q: TemplateStringsArray) => (sql.push(sqlOf(q)), 1) };
    await eraseAiArtifact(tx as never, { kind: 'ai_sales_intent', recordId: 's1' });
    expect(sql[0]).toContain("THEN 'invalidated'");
    expect(sql[0]).toContain("'privacy_erased'");
    expect(sql[0]).toContain('source_ids = ARRAY[source_message_id]');
    expect(sql[0]).toContain('original_contact_id = NULL');
    expect(sql[0]).not.toMatch(/source_message_id\s*=/);
    await eraseAiArtifact(tx as never, { kind: 'ai_sales_publication', recordId: 'p1' });
    expect(sql[1]).toContain("state = 'invalidated', items = '[]'::jsonb, alternatives = '[]'::jsonb");
    await expect(eraseAiArtifact(tx as never, { kind: 'ai_run', recordId: 'x' })).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});

describe('hàng rào nguồn khách (thứ tự khoá)', () => {
  function fenceTx(contact = '0190f000-0000-7000-8000-0000000000aa') {
    const log: string[] = [];
    const tx = {
      $queryRaw: async (q: TemplateStringsArray, ...v: unknown[]) => {
        const s = sqlOf(q);
        if (s.includes('SELECT contact_id FROM')) return (log.push('read-root'), [{ contact_id: contact }]);
        if (s.includes('FROM contact WHERE id')) return (log.push('lock-contact'), []);
        if (s.includes('FROM conversation WHERE id')) return (log.push('lock-conversation'), []);
        if (s.includes('FROM message WHERE id = ANY')) return (log.push(`lock-messages:${(v[0] as string[]).join(',')}`), []);
        return [];
      },
      $executeRaw: async (q: TemplateStringsArray) => (log.push(sqlOf(q).includes('source_ids &&') ? 'invalidate-by-message' : 'invalidate-conversation'), 2),
    };
    return { tx: tx as never, log };
  }
  const C = '0190f000-0000-7000-8000-000000000001';

  it('xoá / thu hồi: khách → hội thoại → tin (tăng dần, gộp trùng) → biên nhận', async () => {
    const { tx, log } = fenceTx();
    expect(await fenceCustomerSource(tx, C, ['m3', 'm1', 'm3'], 'source_deleted', NOW)).toBe(2);
    expect(log).toEqual(['read-root', 'lock-contact', 'read-root', 'lock-conversation', 'lock-messages:m1,m3', 'invalidate-by-message']);
  });

  it('xoá lịch sử: vô hiệu mọi biên nhận prepared của hội thoại (không khoá tin lẻ)', async () => {
    const { tx, log } = fenceTx();
    await fenceCustomerSource(tx, C, null, 'history_cleared', NOW);
    expect(log).toEqual(['read-root', 'lock-contact', 'read-root', 'lock-conversation', 'invalidate-conversation']);
  });
});
