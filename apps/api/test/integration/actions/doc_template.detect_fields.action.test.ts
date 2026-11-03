// Ma trận doc_template.detect_fields (TIP-023b R2, model giả): nhận diện trường từ .docx mẫu · tệp không phải docx → 422 · 403 (sales không có
// documents.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let m: Matrix;
let docx: string;
let txt: string;
const fx = (n: string) => readFileSync(join(import.meta.dirname, '../../../../../packages/core/test/fixtures/documents', n));
async function upload(name: string, body: Buffer) {
  const form = new FormData();
  form.set('purpose', 'document');
  form.set('file', new Blob([new Uint8Array(body)]), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.token}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}

beforeAll(async () => {
  m = await matrix('doc_template.detect_fields');
  docx = await upload('hop-dong-spa.docx', fx('hop-dong-spa.docx'));
  txt = await upload('ghi-chu.txt', Buffer.from('xin chao'));
}, 120_000);
afterAll(() => m?.close());

describe('doc_template.detect_fields', () => {
  it('happy: trường + checklist pháp lý', async () => {
    const r = await m.act({ kind: 'contract', file_id: docx });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.fields.length).toBeGreaterThan(0);
    expect(Array.isArray(r.body.data.result.checklist)).toBe(true);
  });

  it('không phải docx → 422 · 403 sales', async () => {
    expect((await m.act({ kind: 'contract', file_id: txt })).body.error.fields).toEqual({ file_id: 'not_docx' });
    expect((await m.act({ kind: 'contract', file_id: docx }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ kind: 'contract', file_id: docx }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.fields.length).toBeGreaterThan(0);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
