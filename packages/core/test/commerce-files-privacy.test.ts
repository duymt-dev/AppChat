// TIP-032d §4.2: kiểm kê "Quên khách" phần Bán hàng có tệp đính kèm đơn / đề nghị — mọi liên kết (kể cả đã gỡ: bytes / bản sao ngoài chưa
// chắc đã xoá) là exclusive của khách; tệp của đề nghị đã gửi / không còn nháp giữ theo ngoại lệ chứng từ (retained_issued), tệp của đơn thì
// không. Thuần — fake $queryRaw đọc câu SQL + gom dòng thành InventoryArtifact; ngữ nghĩa dòng thật ở integration commerce-files.
import { describe, expect, it } from 'vitest';
import type { TenantTx } from '../src/kernel/actions/action-context';
import { salesInventory } from '../src/sales/privacy/inventory';

const C = '0193a000-0000-7000-8000-0000000000c1';

function fake(rows: Record<string, unknown>[]) {
  const seen: string[] = [];
  const tx = {
    $queryRaw: async (sql: { strings?: readonly string[] } | TemplateStringsArray) => {
      seen.push(('strings' in sql && sql.strings ? sql.strings : (sql as TemplateStringsArray)).join('?'));
      return rows;
    },
  } as unknown as TenantTx;
  return { tx, seen };
}

describe('salesInventory — tệp đính kèm', () => {
  it('câu kiểm kê có order_attachment + invoice_attachment theo khách, KHÔNG lọc detached_at (liên kết đã gỡ vẫn kiểm kê)', async () => {
    const { tx, seen } = fake([]);
    await salesInventory(tx, [C]);
    const sql = seen.join('\n');
    expect(sql).toMatch(/'order_attachment'[\s\S]*FROM order_attachment a JOIN "order" o ON o\.id = a\.order_id WHERE o\.contact_id = ANY/);
    expect(sql).toMatch(/'invoice_attachment'[\s\S]*FROM invoice_attachment a JOIN invoice i ON i\.id = a\.invoice_id WHERE i\.contact_id = ANY/);
    expect(sql).not.toMatch(/detached_at/);
    // Đơn: không ngoại lệ chứng từ; đề nghị: giữ khi đã gửi / không còn nháp.
    expect(sql).toMatch(/'order_attachment', a\.id, a\.version, 'exclusive', false/);
    expect(sql).toMatch(/'invoice_attachment', a\.id, a\.version, 'exclusive', \(i\.sent_at IS NOT NULL OR i\.status <> 'draft'\)/);
  });

  it('gom dòng: exclusive, retainedIssued chỉ khi đề nghị đã phát hành', async () => {
    const { tx } = fake([
      { kind: 'order_attachment', record_id: 'a1', revision: 2, ownership: 'exclusive', retained_issued: false },
      { kind: 'invoice_attachment', record_id: 'a2', revision: 1, ownership: 'exclusive', retained_issued: true },
      { kind: 'invoice_attachment', record_id: 'a3', revision: 1, ownership: 'exclusive', retained_issued: false },
    ]);
    expect(await salesInventory(tx, [C])).toEqual([
      { kind: 'order_attachment', recordId: 'a1', revision: 2, ownership: 'exclusive' },
      { kind: 'invoice_attachment', recordId: 'a2', revision: 1, ownership: 'exclusive', retainedIssued: true },
      { kind: 'invoice_attachment', recordId: 'a3', revision: 1, ownership: 'exclusive' },
    ]);
  });
});
