// TIP-043 — mock hàng chờ học từ hội thoại khớp zod chung (kbSuggestionListSchema / kbSuggestionSchema) và cùng luật server: duyệt sửa
// đáp án → tài liệu "từ hội thoại" kế thừa thư mục internal; còn SĐT → 422 sensitive_data; version lệch → STALE_VERSION; đã duyệt → CONFLICT;
// từ chối không tạo tài liệu; cursor không trùng.
import { beforeEach, describe, expect, it } from 'vitest';
import { kbSuggestionListSchema, kbSuggestionSchema, type ApiRequestError } from '@appchat/shared';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createKbSuggestionState } from './kb-suggestions';
import { createSettingsAiState } from './settings-ai';

const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return (e as ApiRequestError).error;
  }
  throw new Error('expected failure');
};

describe('mock kb.suggestion.* (TIP-043)', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().kbSuggestions = createKbSuggestionState();
    mockDb().settingsAi = createSettingsAiState();
  });

  it('GET /kb/suggestions khớp zod; cursor không trùng; /:id', async () => {
    const a = kbSuggestionListSchema.parse(await mockTransport.get('/kb/suggestions', { status: 'pending', limit: 2 }));
    expect(a.data).toHaveLength(2);
    expect(a.meta.pending).toBe(3);
    const b = kbSuggestionListSchema.parse(await mockTransport.get('/kb/suggestions', { status: 'pending', limit: 2, cursor: a.next_cursor! }));
    expect(b.data.map((x) => x.id)).not.toContain(a.data[0]!.id);
    expect(b.next_cursor).toBeNull();
    expect(kbSuggestionSchema.parse(await mockTransport.get('/kb/suggestions/sg_1')).status).toBe('pending');
  });

  it('duyệt (sửa đáp án, thư mục internal) → tài liệu từ hội thoại kế thừa internal; lần hai CONFLICT', async () => {
    await mockTransport.action('kb.folder.update', { folder_id: 'f_price', visibility: 'internal' });
    const r = await mockTransport.action('kb.suggestion.approve', { suggestion_id: 'sg_1', if_version: 1, answer: 'Đổi trước 24 giờ, miễn phí.', folder_id: 'f_price' });
    expect(r.status).toBe(200);
    const id = r.status === 200 ? (r.data.result as { kb_source_id: string }).kb_source_id : '';
    const doc = mockDb().settingsAi.kb.docs.find((d) => d.id === id) as unknown as { source: string; visibility: string; origin: string };
    expect(doc).toMatchObject({ source: 'conv', visibility: 'internal', origin: 'conversation' });
    expect(mockDb().kbSuggestions.find((s) => s.id === 'sg_1')).toMatchObject({ status: 'approved', edited: true, version: 2 });
    expect((await fail(mockTransport.action('kb.suggestion.approve', { suggestion_id: 'sg_1', if_version: 2 }))).code).toBe('CONFLICT');
  });

  it('còn SĐT → 422 sensitive_data; version lệch → STALE_VERSION; từ chối không tạo tài liệu', async () => {
    expect((await fail(mockTransport.action('kb.suggestion.approve', { suggestion_id: 'sg_2', if_version: 1, answer: 'Gọi 0909123456' }))).fields).toEqual({ answer: 'sensitive_data:phone' });
    expect((await fail(mockTransport.action('kb.suggestion.reject', { suggestion_id: 'sg_2', if_version: 7 }))).code).toBe('STALE_VERSION');
    const n = mockDb().settingsAi.kb.docs.length;
    await mockTransport.action('kb.suggestion.reject', { suggestion_id: 'sg_2', if_version: 1, reason: 'Cũ' });
    expect(mockDb().settingsAi.kb.docs).toHaveLength(n);
    expect(kbSuggestionListSchema.parse(await mockTransport.get('/kb/suggestions', { status: 'rejected' })).data[0]).toMatchObject({ id: 'sg_2', reject_reason: 'Cũ' });
  });
});
