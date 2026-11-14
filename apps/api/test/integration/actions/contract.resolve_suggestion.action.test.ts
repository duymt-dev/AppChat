// Ma trận contract.resolve_suggestion (TIP-030b spec 11): Giữ / Bỏ khối gợi ý AI của hợp đồng nháp theo version (CAS) — người sau với version
// cũ → 409 kèm version hiện tại, không ghi đè im lặng. Hết pending → trình duyệt được. Hợp đồng đã rời nháp → INVALID_TRANSITION. 403 cs ·
// sales ngoài scope → không thấy. Khối đã Giữ vào nội dung ký (escape), khối Bỏ không render (unit: contract-draft-suggestions.test.ts).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let id: string;

beforeAll(async () => {
  m = await matrix('contract.resolve_suggestion');
  await m.credit(1000);
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan', phone: '0909480501' })).contact_id;
  await m.seed('product.create', { name: 'Liệu trình trị mụn 10 buổi', type: 'package', price: '4500000', tax_rate: 8 });
  const brief = ['- Liệu trình trị mụn 10 buổi x1', 'ĐIỀU KHOẢN: Bảo hành kết quả 30 ngày', 'ĐIỀU KHOẢN: Hoàn tiền 100% nếu không hài lòng'].join('\n');
  const pid = (await m.seed('contract.prepare_draft', { contact_id: lan, brief, request_key: 'r1' })).proposal_id;
  id = (await m.seed('contract.draft_from_content', { proposal_id: pid })).contract_id;
}, 120_000);
afterAll(() => m?.close());

describe('contract.resolve_suggestion', () => {
  it('403 cs · sales ngoài scope → không thấy · id lạ → 404', async () => {
    expect((await m.act({ contract_id: id, suggestion_id: 's1', decision: 'keep', if_version: 1 }, m.cs)).status).toBe(403);
    expect([403, 404]).toContain((await m.act({ contract_id: id, suggestion_id: 's1', decision: 'keep', if_version: 1 }, m.sales)).status);
    expect((await m.act({ contract_id: id, suggestion_id: 'nope', decision: 'keep', if_version: 1 })).status).toBe(404);
  });

  it('preview Trợ lý → Giữ s1; version cũ → 409 kèm version hiện tại; Bỏ s2 → trình duyệt được', async () => {
    const { preview, done } = await m.confirm({ contract_id: id, suggestion_id: 's1', decision: 'keep', if_version: 1 });
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'contract', after: { 'suggestion.s1': 'kept' } }] });
    expect(done.body.data.result).toEqual({ contract_id: id, suggestion_id: 's1', status: 'kept', version: 2, pending: 1 });
    const stale = await m.act({ contract_id: id, suggestion_id: 's1', decision: 'discard', if_version: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.fields).toEqual({ version: '2' });
    expect(await m.seed('contract.submit', { contract_id: id }).catch((e: Error) => e.message)).toMatch(/422 .*unresolved/);
    expect((await m.act({ contract_id: id, suggestion_id: 's2', decision: 'discard', if_version: 1 })).body.data.result.pending).toBe(0);
    expect((await m.seed('contract.submit', { contract_id: id })).status).toBe('pending_approval');
    const c = await (await m.db()).contract.findUniqueOrThrow({ where: { id } });
    expect((c.aiSuggestions as { id: string; status: string }[]).map((s) => `${s.id}:${s.status}`)).toEqual(['s1:kept', 's2:discarded']);
  });

  it('hợp đồng đã rời nháp → INVALID_TRANSITION', async () => {
    const r = await m.act({ contract_id: id, suggestion_id: 's1', decision: 'discard', if_version: 2 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('agentGrantable; ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ risk: 'write', agentGrantable: true, permission: 'contract.draft' });
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
