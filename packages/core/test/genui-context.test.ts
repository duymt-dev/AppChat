// TIP-023c G2.6 (hợp đồng an toàn 8): ngữ cảnh màn từ trình duyệt là gợi ý — server đọc lại từng id bằng `<entity>.get` theo quyền HIỆN
// HÀNH; bản ghi không xem được (404 / 403) bị bỏ khỏi entity / selection, id sai dạng không gọi action, thực thể không có get → chỉ còn
// route. Lỗi hệ thống không bị nuốt. Prompt chỉ nhận id đã lọc.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { AppError, authzForRole } from '@appchat/shared';
import type { ToolExecutor } from '../src/kernel/actions/executor';
import { resolveContext, SELECTION_RESOLVE_MAX } from '../src/ai/assistant/genui/context';
import { contextLine } from '../src/ai/assistant/assistant-prompt';
import type { AssistantTurnCtx } from '../src/ai/assistant/meta-tools';

const t: AssistantTurnCtx = { ws: 'w', runId: 'r', userId: 'u_sales', authz: authzForRole('sales', 'u_sales'), mode: 'cowork', locale: 'vi', role: 'sales' };

/** Executor giả: `visible` đọc được; `forbidden` → 403; `boom` → lỗi hệ thống; còn lại 404. */
function fakeExecutor(visible: string[], opts: { implemented?: (id: string) => boolean } = {}) {
  const calls: { actionId: string; input: Record<string, string>; source: string }[] = [];
  const ex: ToolExecutor = {
    isImplemented: opts.implemented ?? (() => true),
    execute: async (ctx, actionId, input) => {
      const i = input as Record<string, string>;
      calls.push({ actionId, input: i, source: ctx.source });
      const id = Object.values(i)[0]!;
      if (id === 'boom') throw new Error('db down');
      if (id === 'forbidden') throw new AppError('FORBIDDEN', 403);
      if (!visible.includes(id)) throw new AppError('NOT_FOUND', 404);
      return { status: 200, data: { result: { id }, action_log_id: '' } } as never;
    },
  };
  return { ex, calls };
}

describe('resolveContext', () => {
  it('giữ bản ghi xem được, bỏ bản ghi ngoài scope / 403 / sai dạng; đọc bằng contact.get nguồn assistant', async () => {
    const { ex, calls } = fakeExecutor(['ct_1', 'ct_2']);
    const out = await resolveContext(ex, t, { route: '/customers', entity: 'contact', id: 'ct_hidden', selection: ['ct_1', 'ct_2', 'forbidden', "x' OR 1=1", 'ct_1'], surface: 'drawer' });
    expect(out).toEqual({ route: '/customers', surface: 'drawer', entity: 'contact', selection: ['ct_1', 'ct_2', 'ct_1'] });
    expect(new Set(calls.map((c) => c.actionId))).toEqual(new Set(['contact.get']));
    expect(calls.every((c) => c.source === 'assistant')).toBe(true);
    expect(calls.map((c) => c.input.contact_id)).not.toContain("x' OR 1=1");
    // mỗi id chỉ đọc một lần
    expect(calls.filter((c) => c.input.contact_id === 'ct_1')).toHaveLength(1);
  });

  it('bản ghi đang mở xem được → giữ id; prompt chỉ có id đã lọc', async () => {
    const { ex } = fakeExecutor(['q_1']);
    const out = await resolveContext(ex, t, { route: '/quotes', entity: 'quote', id: 'q_1', selection: ['q_2'] });
    expect(out).toEqual({ route: '/quotes', entity: 'quote', id: 'q_1' });
    const line = contextLine(out, undefined, '—');
    expect(line).toContain('quote: q_1');
    expect(line).not.toContain('q_2');
  });

  it('thực thể không có action get / chưa cài → chỉ route; không ngữ cảnh → undefined', async () => {
    const { ex, calls } = fakeExecutor(['x']);
    expect(await resolveContext(ex, t, { route: '/marketing', entity: 'segment', id: 'sg_1', selection: ['sg_2'] })).toEqual({ route: '/marketing' });
    const off = fakeExecutor(['ct_1'], { implemented: () => false });
    expect(await resolveContext(off.ex, t, { route: '/customers', entity: 'contact', id: 'ct_1' })).toEqual({ route: '/customers' });
    expect(calls).toHaveLength(0);
    expect(await resolveContext(ex, t, undefined)).toBeUndefined();
  });

  it(`kiểm tối đa ${SELECTION_RESOLVE_MAX} dòng chọn; lỗi hệ thống ném tiếp (không coi là "không thấy")`, async () => {
    const many = Array.from({ length: 50 }, (_, i) => `ct_${i}`);
    const { ex, calls } = fakeExecutor(many);
    const out = await resolveContext(ex, t, { entity: 'contact', selection: many });
    expect(out?.selection).toHaveLength(SELECTION_RESOLVE_MAX);
    expect(calls.length).toBeLessThanOrEqual(SELECTION_RESOLVE_MAX);
    await expect(resolveContext(fakeExecutor([]).ex, t, { entity: 'contact', id: 'boom' })).rejects.toThrow('db down');
  });
});
