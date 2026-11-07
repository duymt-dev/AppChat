// TIP-030b spec 2–4 — nguồn tệp của hợp đồng: cột nguồn bất biến từ guard; nội dung ký đọc lại bản gốc + kiểm hash (bản gốc đổi →
// 409 hash_mismatch, không ký); PDF dùng nguyên bản, DOCX dùng bản đã đổi cô lập (hash khớp) hoặc đổi qua launcher (không có → 501);
// tệp đính kèm chỉ nhận link ký nội bộ đúng origin / workspace / chữ ký (CDN của kênh → null = not_stored).
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { benignDocx, pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { storedFileId } from '../src/contracts/files/attachment-source';
import { signingContent, sourceCols } from '../src/contracts/files/source';
import { signedFileUrl } from '../src/kernel/files/signed-url';
import type { FilesService } from '../src/kernel/files/files.service';

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const KEY = Buffer.alloc(32, 7);
const WS = 'ws_test';
const FID = '0b7c1f9e-2d4a-4e8b-9c1d-3f5a6b7c8d9e';
const links = { apiBase: 'https://api.example.vn', key: KEY };

const store = (m: Record<string, Buffer>) => ({ read: vi.fn(async (_db: unknown, id: string) => (m[id] ? { row: {}, body: m[id]! } : null)) }) as unknown as FilesService;
const db = {} as never;
const rec = (o: Partial<Parameters<typeof signingContent>[3]>) => ({ sourceFileId: 'src', sourceHash: null, sourceMime: null, renderedUnsignedFileId: null, renderedUnsignedHash: null, ...o });

describe('sourceCols', () => {
  it('maps the guarded document to immutable source columns', () => {
    expect(sourceCols({ fileId: 'f1', sha256: 'h', mime: 'application/pdf' } as never)).toEqual({ source: 'file', sourceFileId: 'f1', sourceHash: 'h', sourceMime: 'application/pdf' });
  });
});

describe('signingContent', () => {
  const p = pdf();
  const d = benignDocx();

  it('PDF source → the original bytes, nothing rendered', async () => {
    const r = await signingContent(db, store({ src: p }), null, rec({ sourceHash: sha(p) }));
    expect(r.pdf.equals(p)).toBe(true);
    expect(r.rendered).toBeNull();
  });

  it('source bytes changed after freeze → 409 hash_mismatch (never signs other content)', async () => {
    await expect(signingContent(db, store({ src: p }), null, rec({ sourceHash: 'f'.repeat(64) }))).rejects.toMatchObject({ httpStatus: 409, fields: { source: 'hash_mismatch' } });
    await expect(signingContent(db, store({}), null, rec({ sourceHash: sha(p) }))).rejects.toMatchObject({ fields: { source: 'hash_mismatch' } });
    await expect(signingContent(db, store({ src: p }), null, rec({ sourceFileId: null }))).rejects.toMatchObject({ fields: { source: 'missing' } });
  });

  it('DOCX with a frozen render whose hash matches → reuse it, no conversion', async () => {
    const out = pdf({ text: 'rendered' });
    const conv = { docxToPdf: vi.fn() };
    const r = await signingContent(db, store({ src: d, ren: out }), conv, rec({ sourceHash: sha(d), renderedUnsignedFileId: 'ren', renderedUnsignedHash: sha(out) }));
    expect(r.pdf.equals(out)).toBe(true);
    expect(r.rendered).toBeNull();
    expect(conv.docxToPdf).not.toHaveBeenCalled();
  });

  it('DOCX render tampered → converts again in isolation; no launcher → 501', async () => {
    const out = pdf({ text: 'fresh' });
    const conv = { docxToPdf: vi.fn(async () => out) };
    const c = rec({ sourceHash: sha(d), renderedUnsignedFileId: 'ren', renderedUnsignedHash: 'f'.repeat(64) });
    const r = await signingContent(db, store({ src: d, ren: pdf() }), conv, c);
    expect(r.rendered?.equals(out)).toBe(true);
    await expect(signingContent(db, store({ src: d }), null, rec({ sourceHash: sha(d) }))).rejects.toMatchObject({ httpStatus: 501, fields: { render: 'render_isolation_unavailable' } });
  }, 20_000);
});

describe('storedFileId', () => {
  const url = signedFileUrl(links.apiBase, KEY, WS, FID);

  it('internal signed link of this workspace → file id', () => {
    expect(storedFileId(url, links, WS)).toBe(FID);
    expect(storedFileId(signedFileUrl('https://api.example.vn/base/', KEY, WS, FID), { ...links, apiBase: 'https://api.example.vn/base' }, WS)).toBe(FID);
  });

  it('foreign origin / other workspace / bad signature / CDN url → null', () => {
    expect(storedFileId(url.replace('api.example.vn', 'evil.example.vn'), links, WS)).toBeNull();
    expect(storedFileId(url, links, 'ws_other')).toBeNull();
    expect(storedFileId(url.replace(/sig=[^&]+/, 'sig=AAAA'), links, WS)).toBeNull();
    expect(storedFileId(signedFileUrl(links.apiBase, Buffer.alloc(32, 1), WS, FID), links, WS)).toBeNull();
    expect(storedFileId('https://f20-zpc.zdn.vn/file/abc.pdf', links, WS)).toBeNull();
    expect(storedFileId('not a url', links, WS)).toBeNull();
  });
});
