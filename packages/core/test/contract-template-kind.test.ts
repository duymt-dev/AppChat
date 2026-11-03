// TIP-030b spec 8: mẫu hợp đồng theo loại — mặc định tách nhóm (chung / từng loại), chọn mẫu chỉ định → mặc định loại → mặc định chung,
// contract_kind chỉ với mẫu hợp đồng, đặt mặc định chỉ tắt mẫu cùng nhóm (loại chứng từ khác không bị ảnh hưởng).
import { describe, expect, it } from 'vitest';
import { checkContractKind, makeGroupDefault, pickContractTemplate } from '../src/documents/services/contract-template';

type Row = { id: string; kind: string; contractKind: string | null; isDefault: boolean; deletedAt: Date | null; version: number };
const match = (r: Row, w: Record<string, unknown>) => Object.entries(w).every(([k, v]) => (r as unknown as Record<string, unknown>)[k] === v);
function fakeTx(rows: Row[]) {
  return {
    rows,
    docTemplate: {
      findFirst: async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, boolean> }) => {
        const r = rows.find((x) => match(x, where));
        return r && select ? Object.fromEntries(Object.keys(select).map((k) => [k, (r as unknown as Record<string, unknown>)[k]])) : (r ?? null);
      },
      count: async ({ where }: { where: Record<string, unknown> }) => rows.filter((r) => match(r, where)).length,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => Object.assign(rows.find((r) => r.id === where.id)!, data),
    },
  } as never as { rows: Row[]; docTemplate: never };
}
const id = (n: number) => `0190${String(n).padStart(4, '0')}-0000-7000-8000-000000000000`;
const row = (n: number, kind: string, contractKind: string | null, isDefault: boolean): Row => ({ id: id(n), kind, contractKind, isDefault, deletedAt: null, version: 1 });

describe('mẫu hợp đồng theo loại', () => {
  it('chọn: mặc định của loại → mặc định chung; mẫu chỉ định phải là hợp đồng cùng loại hoặc chung', async () => {
    const tx = fakeTx([row(1, 'contract', null, true), row(2, 'contract', 'sale', true), row(3, 'contract', 'service', false), row(4, 'quote', null, true)]);
    expect(await pickContractTemplate(tx as never, 'sale')).toEqual({ id: id(2), version: 1 });
    expect(await pickContractTemplate(tx as never, 'framework')).toEqual({ id: id(1), version: 1 });
    expect(await pickContractTemplate(tx as never, 'service', id(3))).toEqual({ id: id(3), version: 1 });
    await expect(pickContractTemplate(tx as never, 'sale', id(3))).rejects.toMatchObject({ fields: { template_id: 'kind_mismatch' } });
    await expect(pickContractTemplate(tx as never, 'sale', id(4))).rejects.toMatchObject({ fields: { template_id: 'not_found' } });
    expect(await pickContractTemplate(fakeTx([]) as never, 'sale')).toBeNull();
  });

  it('đặt mặc định chỉ đổi trong nhóm: mặc định chung + mẫu loại khác + loại chứng từ khác giữ nguyên', async () => {
    const tx = fakeTx([row(1, 'contract', null, true), row(2, 'contract', 'sale', true), row(3, 'contract', 'sale', false), row(4, 'quote', null, true)]);
    expect(await makeGroupDefault(tx as never, 'contract', 'sale', id(3))).toBe(id(2));
    expect(tx.rows.filter((r) => r.isDefault).map((r) => r.id).sort()).toEqual([id(1), id(3), id(4)]);
    expect(await makeGroupDefault(tx as never, 'contract', 'sale', id(3))).toBeNull();
  });

  it('contract_kind chỉ với mẫu hợp đồng, đúng 3 loại', () => {
    expect(checkContractKind('contract', 'sale')).toBe('sale');
    expect(checkContractKind('contract', null)).toBeNull();
    expect(checkContractKind('quote', undefined)).toBeNull();
    expect(() => checkContractKind('quote', 'sale')).toThrow();
    expect(() => checkContractKind('contract', 'lease')).toThrow();
  });
});
