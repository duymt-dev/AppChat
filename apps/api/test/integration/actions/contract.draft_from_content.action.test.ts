// Ma trận contract.draft_from_content (TIP-030b spec 9, AC3): tạo đúng MỘT nháp từ đề xuất bất biến — preview / xác nhận / thử lại không gọi
// model, không thêm run. Điều khoản mẫu giữ nguyên (mẫu theo loại); gợi ý AI vào ở trạng thái pending và chặn trình duyệt. Đề xuất của người
// khác → 404; đã dùng → trả cùng hợp đồng; hết hạn → 409 expired. 403 cs · undo xoá mềm.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
const BRIEF = ['- Liệu trình trị mụn 10 buổi x1', 'Thời hạn 01/12/2026 đến 30/11/2027', 'ĐIỀU KHOẢN: Bảo hành kết quả 30 ngày'].join('\n');

const prepare = async (key: string, who?: Matrix['sales']) => (await m.seed('contract.prepare_draft', { contact_id: lan, kind: 'service', brief: BRIEF, request_key: key }, who)).proposal_id as string;
const runs = async () => (await m.db()).aiRun.count({ where: { title: 'contract.prepare_draft' } });

beforeAll(async () => {
  m = await matrix('contract.draft_from_content');
  await m.credit(1000);
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan', phone: '0909480401' })).contact_id;
  await m.seed('product.create', { name: 'Liệu trình trị mụn 10 buổi', type: 'package', price: '4500000', tax_rate: 8 });
}, 120_000);
afterAll(() => m?.close());

describe('contract.draft_from_content', () => {
  it('preview Trợ lý (đúng đề xuất, không model) → xác nhận → một nháp ai_suggested pending; thử lại → cùng hợp đồng', async () => {
    const pid = await prepare('d1');
    const n = await runs();
    const { preview, done } = await m.confirm({ proposal_id: pid });
    expect(preview).toMatchObject({ risk: 'write', warnings: ['ai_suggested'], changes: [{ entity: 'contract', after: { contact: 'Chị Lan', value: '4500000', start_date: '2026-12-01' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.pending_suggestions).toBe(1);
    const id = done.body.data.result.contract_id;
    const db = await m.db();
    const c = await db.contract.findUniqueOrThrow({ where: { id } });
    expect(c).toMatchObject({ status: 'draft', source: 'template', draftProposalId: pid, value: 4_500_000n, createdByType: 'user' });
    expect(c.aiSuggestions).toEqual([{ id: 's1', text: 'Bảo hành kết quả 30 ngày', status: 'pending', version: 1 }]);
    const again = await m.act({ proposal_id: pid });
    expect(again.body.data.result.contract_id).toBe(id);
    expect(await db.contract.count({ where: { draftProposalId: pid } })).toBe(1);
    expect(await runs()).toBe(n);
    // Cổng trình duyệt: còn gợi ý pending → 422.
    expect(await m.seed('contract.submit', { contract_id: id }).catch((e: Error) => e.message)).toMatch(/seed contract.submit 422 .*ai_suggestions.*unresolved/);
  });

  it('hai lần xác nhận đồng thời → một hợp đồng', async () => {
    const pid = await prepare('d-race');
    const [a, b] = await Promise.all([m.act({ proposal_id: pid }), m.act({ proposal_id: pid })]);
    const ok = [a, b].filter((r) => r.status === 200);
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(new Set(ok.map((r) => r.body.data.result.contract_id)).size).toBe(1);
    expect(await (await m.db()).contract.count({ where: { draftProposalId: pid } })).toBe(1);
  });

  it('đề xuất của người khác → 404 · hết hạn → 409 expired · 403 cs', async () => {
    const pid = await prepare('d-other');
    expect((await m.act({ proposal_id: pid }, m.cs)).status).toBe(403);
    expect((await m.act({ proposal_id: pid }, m.sales)).status).toBe(404);
    await (await m.db()).contractDraftProposal.update({ where: { id: pid }, data: { expiresAt: new Date(m.h.clock.now().getTime() - 1000) } });
    const r = await m.act({ proposal_id: pid });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ proposal_id: 'expired' });
  });

  it('nội dung đề xuất bất biến (trigger DB)', async () => {
    const pid = await prepare('d-immut');
    await expect((await m.db()).contractDraftProposal.update({ where: { id: pid }, data: { content: { title: 'khác' } } })).rejects.toThrow(/immutable/);
  });

  it('undo xoá mềm nháp; đề xuất đã dùng không tạo lại', async () => {
    const pid = await prepare('d-undo');
    const r = await m.act({ proposal_id: pid });
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contract.findUniqueOrThrow({ where: { id: r.body.data.result.contract_id } })).deletedAt).not.toBeNull();
    expect((await m.act({ proposal_id: pid })).status).toBe(409);
  });

  it('agentGrantable, undo 24h; ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ risk: 'write', agentGrantable: true, permission: 'contract.draft', undo: { windowSec: 86_400 } });
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
