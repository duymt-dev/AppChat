// TIP-021b §1.2, §2.3–2.4, §3.2 (AC3–AC5): một lời gọi model mỗi lần soạn, qua runtime 019b (run có id cấp sẵn = binding.run_id); dừng
// cứng (credit / ngân sách / huỷ / usage không rõ / provider lỗi) KHÔNG BAO GIỜ thành bản soạn — lỗi có operation_id; fallback tất định
// chỉ cho lý do đã khai (không route / không hỗ trợ schema / khuôn sai) và không gọi thêm; không runtime → tất định no_model_route.
import { describe, expect, it } from 'vitest';
import { draftHarness, modelDraft, RID, RID2 } from './fixtures/agent-draft-harness';

const DESC = 'Agent đặt lịch spa qua Zalo';

describe('soạn agent — đo đếm và dừng cứng', () => {
  it('run tạo với id = binding.run_id, input không chứa mô tả; đúng một lời gọi model', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }] });
    await h.draft(DESC, RID);
    expect(h.calls).toBe(1);
    expect(h.runs).toHaveLength(1);
    expect(h.runs[0]!.id).toBe(h.rows[0]!.runId);
    expect(JSON.stringify(h.runs[0]!.input)).not.toContain('spa');
  });

  it.each([
    ['CREDIT_EXHAUSTED', 'CREDIT_EXHAUSTED'],
    ['BUDGET', 'INVALID_STATE'],
    ['USAGE_UNKNOWN', 'INVALID_STATE'],
    ['LLM_ERROR', 'INTERNAL'],
  ])('run failed %s → lỗi %s kèm operation_id, binding rejected, không đề xuất', async (code, api) => {
    const h = draftHarness({ results: [{ status: 'failed', error: { code, message: 'x' } }] });
    const err = await h.draft(DESC, RID).catch((e) => e);
    expect(err).toMatchObject({ code: api, fields: expect.objectContaining({ operation_id: h.rows[0]!.id }) });
    expect(h.rows[0]).toMatchObject({ phase: 'rejected', safeReason: code, publishedResult: null });
  });

  it('huỷ run → INVALID_STATE cancelled, không bản soạn', async () => {
    const h = draftHarness({ results: [{ status: 'cancelled' }] });
    await expect(h.draft(DESC, RID)).rejects.toMatchObject({ code: 'INVALID_STATE', fields: expect.objectContaining({ draft: 'cancelled' }) });
  });

  it.each([
    ['NO_MODEL_ROUTE', 'no_model_route'],
    ['STRUCTURED_UNSUPPORTED', 'structured_unsupported'],
    ['STRUCTURED_MALFORMED', 'malformed_output'],
  ])('%s → mẫu tất định có lý do %s, không gọi thêm', async (code, reason) => {
    const h = draftHarness({ results: [{ status: 'failed', error: { code, message: 'x' } }, { status: 'completed', text: modelDraft([]) }] });
    const out = await h.draft(DESC, RID);
    expect(h.calls).toBe(1);
    expect(out.generation_info).toMatchObject({ mode: 'deterministic', fallback_reason: reason });
    expect(h.rows[0]!.phase).toBe('published');
  });

  it('không runtime AI → tất định no_model_route, không tạo run', async () => {
    const h = draftHarness({ runner: false });
    const out = await h.draft(DESC, RID);
    expect(out.generation_info).toMatchObject({ mode: 'deterministic', fallback_reason: 'no_model_route' });
    expect(h.runs).toHaveLength(0);
  });

  it('gửi lại cùng request_id (đã xong) → không gọi model lần hai, cùng operation_id', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }] });
    const a = await h.draft(DESC, RID);
    const b = await h.draft(DESC, RID);
    expect(h.calls).toBe(1);
    expect(b.generation_info.operation_id).toBe(a.generation_info.operation_id);
  });

  it('gửi lại cùng request_id sau dừng cứng → cùng lỗi, không gọi lại model', async () => {
    const h = draftHarness({ results: [{ status: 'failed', error: { code: 'CREDIT_EXHAUSTED', message: 'x' } }] });
    await h.draft(DESC, RID).catch(() => undefined);
    await expect(h.draft(DESC, RID)).rejects.toMatchObject({ code: 'CREDIT_EXHAUSTED' });
    expect(h.calls).toBe(1);
  });

  it('cùng request_id + mô tả khác → 409 trước khi gọi model; request_id mới = lần soạn mới (có tính phí bình thường)', async () => {
    const h = draftHarness({ results: [{ status: 'completed', text: modelDraft([]) }, { status: 'completed', text: modelDraft([]) }] });
    await h.draft(DESC, RID);
    await expect(h.draft('Agent bán hàng khác hẳn', RID)).rejects.toMatchObject({ code: 'CONFLICT', fields: { request_id: 'description_changed' } });
    expect(h.calls).toBe(1);
    await h.draft('Agent bán hàng khác hẳn', RID2);
    expect(h.calls).toBe(2);
  });
});
