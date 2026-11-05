// TIP-030b spec 5 — lớp 2 guard tệp hợp đồng: kiểm gói DOCX trước khi giải nén (zip bomb / đường đi ngược / macro / quan hệ ngoài /
// đối tượng nhúng / field code / mã hoá) và PDF (mã hoá / nội dung chủ động — kể cả tên #xx và khoá giấu trong object stream nén /
// tệp nhúng / quá 200 trang); loại tệp theo bytes, không theo đuôi (`.exe` đổi tên `.pdf` bị từ chối). Tệp mẫu: fixtures/contracts/files.
import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { AppError } from '@appchat/shared';
import { badDocx, badPdf, benignDocx, pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { inspectDocx, zipEntries } from '../src/documents/security/docx-container';
import { inspectPdf } from '../src/documents/security/pdf-inspection';
import { inspectContractBytes } from '../src/documents/security/document-guard';

const reason = async (p: Promise<unknown> | (() => unknown)) => {
  try {
    await (typeof p === 'function' ? p() : p);
    return 'ok';
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    const err = e as AppError;
    expect(err.httpStatus).toBe(422);
    return err.fields?.file;
  }
};

describe('DOCX container', () => {
  it('benign contract passes and central directory is read without inflating', () => {
    const body = benignDocx();
    expect(zipEntries(body).map((e) => e.name)).toContain('word/document.xml');
    expect(inspectDocx(body).file('word/document.xml')!.asText()).toContain('HỢP ĐỒNG DỊCH VỤ');
  });

  it.each([
    ['externalRelationship', 'external_relationship'],
    ['macro', 'macro'],
    ['embeddedObject', 'embedded_object'],
    ['fieldCode', 'field_code'],
    ['pathTraversal', 'path_traversal'],
    ['zipBomb', 'zip_bomb'],
    ['encrypted', 'encrypted'],
    ['notDocx', 'not_docx'],
  ] as const)('%s → %s', async (k, want) => {
    expect(await reason(() => inspectDocx(badDocx[k]()))).toBe(want);
  });

  it('zip bomb is refused from header sizes before any inflate', () => {
    const bomb = badDocx.zipBomb();
    expect(bomb.length).toBeLessThan(200 * 1024);
    const big = zipEntries(bomb).find((e) => e.name.endsWith('bomb.xml'))!;
    expect(big.size).toBe(30 * 1024 * 1024);
  });

  it('over 10MB → too_large', async () => {
    expect(await reason(() => inspectDocx(Buffer.concat([benignDocx(), Buffer.alloc(10 * 1024 * 1024)])))).toBe('too_large');
  });
});

describe('PDF inspection', () => {
  it('benign PDF passes with page count', async () => {
    expect(await inspectPdf(pdf({ pages: 3 }))).toEqual({ pages: 3 });
  });

  it.each([
    ['javascript', 'active_content'],
    ['hexEscapedJs', 'active_content'],
    ['launch', 'active_content'],
    ['embeddedFile', 'embedded_file'],
    ['encrypted', 'encrypted'],
    ['tooManyPages', 'too_many_pages'],
    ['renamedExe', 'not_pdf'],
    ['notPdf', 'not_pdf'],
  ] as const)('%s → %s', async (k, want) => {
    expect(await reason(inspectPdf(badPdf[k]()))).toBe(want);
  });

  it('JavaScript hidden in a compressed object stream is still refused (structural walk)', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const js = doc.context.obj({ S: 'JavaScript', JS: PDFString.of('app.alert(1)') });
    doc.catalog.set(PDFName.of('OpenAction'), doc.context.register(js));
    const body = Buffer.from(await doc.save({ useObjectStreams: true }));
    // Khoá không lộ trên bytes thô (đã nén trong ObjStm) …
    expect(body.toString('latin1')).not.toContain('/JavaScript');
    // … nhưng duyệt đối tượng vẫn bắt được.
    expect(await reason(inspectPdf(body))).toBe('active_content');
  });

  it('parse timeout → parse_timeout', async () => {
    expect(await reason(inspectPdf(pdf({ pages: 150 }), { maxBytes: 25 * 1024 * 1024, pages: 200, parseMs: 0 }))).toBe('parse_timeout');
  });
});

describe('type by bytes, not by extension / declared mime', () => {
  it('PDF and DOCX are sniffed from bytes', async () => {
    expect(await inspectContractBytes(pdf())).toMatchObject({ type: 'pdf', pages: 1 });
    expect(await inspectContractBytes(benignDocx())).toMatchObject({ type: 'docx' });
  });

  it('.exe renamed .pdf / html / image → unsupported_type', async () => {
    expect(await reason(inspectContractBytes(badPdf.renamedExe()))).toBe('unsupported_type');
    expect(await reason(inspectContractBytes(badPdf.notPdf()))).toBe('unsupported_type');
    expect(await reason(inspectContractBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])))).toBe('unsupported_type');
  });

  it('bad DOCX reason flows through the sniffed path', async () => {
    expect(await reason(inspectContractBytes(badDocx.macro()))).toBe('macro');
    expect(await reason(inspectContractBytes(badPdf.javascript()))).toBe('active_content');
  });
});
