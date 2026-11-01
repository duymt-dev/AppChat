// TIP-019 / 020: route mock Cài đặt › Mô hình AI + Dữ liệu RAG đúng shape đọc dùng chung với API thật (packages/shared/src/api/ai.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { aiSettingsSchema, kbDataSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (schema: z.ZodType, v: unknown) => {
  const r = schema.safeParse(v);
  return r.success ? [] : r.error.issues;
};

describe('mock AI — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /settings/ai · /settings/kb (mọi nav)', async () => {
    expect(issues(aiSettingsSchema, await mockTransport.get('/settings/ai'))).toEqual([]);
    for (const nav of ['all', 'learned', 'trash']) expect(issues(kbDataSchema, await mockTransport.get('/settings/kb', { nav }))).toEqual([]);
  });

  it('upload → kb.add_source { file_id } → có trong danh sách', async () => {
    const f = await mockTransport.upload(new File(['# a'], 'Quy trình.md'), 'kb');
    await mockTransport.action('kb.add_source', { name: 'Quy trình.md', file_id: f.file_id, visibility: 'internal' });
    const kb = await mockTransport.get<z.infer<typeof kbDataSchema>>('/settings/kb', { nav: 'all' });
    expect(kb.data[0]).toMatchObject({ name: 'Quy trình.md', visibility: 'internal' });
  });
});
