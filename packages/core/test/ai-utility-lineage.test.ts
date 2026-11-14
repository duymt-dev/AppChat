// TIP-019b §3.1 (đơn vị): cha tin cậy chỉ từ ActionContext.runId — không có run → gốc riêng; cha không tồn tại / đã kết thúc → 409 (không
// bịa gốc mới); khoá con theo khoá idempotent (hai lời gọi cùng action trong một bước không chung run con); run con đã xong → trả kết quả cũ.
import { describe, expect, it } from 'vitest';
import { reuseChild, trustedParent } from '../src/ai/public';

const db = (rows: Record<string, { id: string; status: string }>, child: Record<string, unknown> | null = null) =>
  ({
    aiRun: {
      findUnique: async ({ where }: { where: { id: string } }) => rows[where.id] ?? null,
      findFirst: async () => child,
    },
  }) as never;

describe('cha tin cậy của run tiện ích', () => {
  it('không có runId (UI gọi trực tiếp) → null (gốc riêng)', async () => {
    expect(await trustedParent(db({}), {}, 'ai.translate')).toBeNull();
  });

  it('cha không tồn tại / đã kết thúc → 409', async () => {
    await expect(trustedParent(db({}), { runId: 'x', stepId: '1' }, 'ai.translate')).rejects.toMatchObject({ code: 'INVALID_STATE', fields: { run: 'parent_missing' } });
    await expect(trustedParent(db({ p: { id: 'p', status: 'completed' } }), { runId: 'p', stepId: '1' }, 'ai.translate')).rejects.toMatchObject({ fields: { run: 'parent_finished' } });
  });

  it('khoá con: có khoá idempotent → theo lời gọi tool; action đọc → bước:action', async () => {
    const d = db({ p: { id: 'p', status: 'running' } });
    const a = await trustedParent(d, { runId: 'p', stepId: '2', idempotencyKey: 'assistant:p:2:call_a' }, 'quote.draft_from_content');
    const b = await trustedParent(d, { runId: 'p', stepId: '2', idempotencyKey: 'assistant:p:2:call_b' }, 'quote.draft_from_content');
    expect(a).toEqual({ parentRunId: 'p', childKey: 'quote.draft_from_content:assistant:p:2:call_a' });
    expect(a!.childKey).not.toBe(b!.childKey);
    expect((await trustedParent(d, { runId: 'p', stepId: '3' }, 'kb.search'))!.childKey).toBe('3:kb.search');
  });

  it('run con đã xong → trả kết quả cũ, không chạy lại; chưa có → null', async () => {
    const done = { id: 'c', status: 'completed', output: { text: 'bản dịch' }, creditsUsed: 2, stopReason: 'success', error: null };
    expect(await reuseChild(db({}, done), { parentRunId: 'p', childKey: 'k' })).toMatchObject({ runId: 'c', status: 'completed', text: 'bản dịch', creditsUsed: 2 });
    expect(await reuseChild(db({}, null), { parentRunId: 'p', childKey: 'k' })).toBeNull();
  });

  it('run con đang chạy quá thời gian chờ → 409 child_running', async () => {
    await expect(reuseChild(db({}, { id: 'c', status: 'running' }), { parentRunId: 'p', childKey: 'k' }, 0)).rejects.toMatchObject({ fields: { run: 'child_running' } });
  });
});
