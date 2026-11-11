// TIP-023g §1.1–1.2 (AC1, AC3): cặp (thực thể, ý định) đóng — lạ / sai khuôn → 422; bản ghi đọc lại bằng action đọc chuẩn với quyền người
// gọi — không thấy / ngoài scope → 404 đồng nhất (không lộ tồn tại), thiếu quyền nền → 403; displayed_version lệch → 409; dòng ngữ cảnh
// prompt chỉ có loại + id + mã (không tiêu đề — dữ liệu không tin cậy).
import { describe, expect, it } from 'vitest';
import { AppError, RECORD_INTENT_PAIRS } from '@appchat/shared';
import { parseRecordIntent } from '../src/ai/assistant/record-intent/registry';
import { resolveRecord } from '../src/ai/assistant/record-intent/context';
import { contextLine } from '../src/ai/assistant/assistant-prompt';
import { resolveRecordTurnContext } from '../src/ai/assistant/genui/context';
import { Q1, recordHarness } from './fixtures/record-ai-harness';

const RID = '0190f000-0000-7000-8000-0000000000f1';
const err = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as AppError;
  }
  throw new Error('expected rejection');
};

describe('parseRecordIntent', () => {
  it('chấp nhận đúng cặp đã khai; cặp lạ / khoá lạ / id không phải UUID → 422', () => {
    expect(parseRecordIntent({ entity: 'quote', entity_id: Q1, intent: 'inspect', request_id: RID })).toMatchObject({ entity: 'quote', intent: 'inspect' });
    for (const [entity, intents] of Object.entries(RECORD_INTENT_PAIRS)) for (const intent of intents) expect(() => parseRecordIntent({ entity, entity_id: Q1, intent, request_id: RID })).not.toThrow();
    const bad = [
      { entity: 'quote', entity_id: Q1, intent: 'product_combo', request_id: RID },
      { entity: 'contact', entity_id: Q1, intent: 'inspect', request_id: RID },
      { entity: 'quote', entity_id: 'q_2041', intent: 'inspect', request_id: RID },
      { entity: 'quote', entity_id: Q1, intent: 'inspect', request_id: RID, actor: 'admin' },
      { entity: 'quote', entity_id: Q1, intent: 'inspect', request_id: RID, user_task: 'x'.repeat(2001) },
    ];
    for (const b of bad) expect(() => parseRecordIntent(b)).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED', httpStatus: 422 }));
  });
});

describe('resolveRecord', () => {
  it('đọc qua getter chuẩn với ngữ cảnh người gọi; không thấy → 404 đồng nhất; thiếu quyền → 403', async () => {
    const h = recordHarness();
    const r = await resolveRecord(h.deps, h.turn(), 'quote', Q1);
    expect(r).toMatchObject({ entity: 'quote', id: Q1, code: 'BG-0001', version: 3 });
    expect(h.executed.at(-1)).toEqual({ id: 'quote.get', input: { quote_id: Q1 } });
    const missing = await err(resolveRecord(h.deps, h.turn(), 'quote', '0190f000-0000-7000-8000-00000000ffff'));
    h.hidden.add(Q1);
    const gone = await err(resolveRecord(h.deps, h.turn(), 'quote', Q1));
    expect([missing.httpStatus, gone.httpStatus]).toEqual([404, 404]);
    // Cùng envelope, không lộ "có nhưng bị ẩn" khác "không có".
    expect(gone.fields).toEqual(missing.fields);
    h.hidden.clear();
    h.revokeAll();
    expect((await err(resolveRecord(h.deps, h.turn(), 'quote', Q1))).httpStatus).toBe(403);
  });

  it('ngữ cảnh lượt theo bản ghi: chỉ id; phiên bản đang thấy lệch → 409; dòng prompt không chứa tiêu đề', async () => {
    const h = recordHarness();
    const ri = { entity: 'quote' as const, entity_id: Q1, intent: 'inspect' as const, request_id: RID };
    expect(await resolveRecordTurnContext(h.deps, h.turn(), ri, '/quotes')).toEqual({ route: '/quotes', surface: 'drawer', entity: 'quote', id: Q1 });
    expect((await err(resolveRecordTurnContext(h.deps, h.turn(), { ...ri, displayed_version: 2 }, '/quotes'))).httpStatus).toBe(409);
    // Prompt nhận ngữ cảnh qua contextLine chung: loại + id, không tiêu đề bản ghi.
    const line = contextLine(await resolveRecordTurnContext(h.deps, h.turn(), ri, '/quotes'), undefined, '');
    expect(line).toContain(`- quote: ${Q1}`);
    expect(line).not.toContain('Báo giá spa');
  });
});
