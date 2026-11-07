// TIP-045b AC1 / annex B — cổng tải tệp chung: loại theo nội dung (không tin đuôi / mime trình duyệt), danh sách theo purpose, khớp đuôi
// + mime, giới hạn theo loại, gói OOXML kiểm hình dạng ZIP / macro trước khi giải nén, tên tệp chuẩn hoá. Tệp thật nhỏ dựng tại chỗ.
import { describe, expect, it } from 'vitest';
import PizZip from 'pizzip';
import type { AppError } from '@appchat/shared';
import { sniff } from '../src/kernel/files/magic';
import { guardUpload, normalizeName, UPLOAD_LIMITS } from '../src/kernel/files/upload-guard';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16]);
const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
const EXE = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64)]);
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isomiso2'), Buffer.alloc(16)]);
const ooxml = (files: Record<string, string>) => {
  const z = new PizZip();
  for (const [k, v] of Object.entries(files)) z.file(k, v);
  return z.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
};
const DOCX = ooxml({ '[Content_Types].xml': '<Types/>', 'word/document.xml': '<w:document/>' });
const XLSX = ooxml({ '[Content_Types].xml': '<Types/>', 'xl/workbook.xml': '<workbook/>' });
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const err = (f: Parameters<typeof guardUpload>[0]) => {
  try {
    guardUpload(f);
  } catch (e) {
    const a = e as AppError;
    return `${a.httpStatus}:${(a.fields as Record<string, string>).file}`;
  }
  return 'ok';
};

describe('nhận diện nội dung', () => {
  it('ảnh / PDF / MP4 (ftyp hợp lệ) / OOXML phân biệt DOCX-XLSX / văn bản / thực thi / CFB / markup', () => {
    expect(sniff(PNG)).toBe('png');
    expect(sniff(JPG)).toBe('jpeg');
    expect(sniff(PDF)).toBe('pdf');
    expect(sniff(MP4)).toBe('mp4');
    expect(sniff(Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftyp'), Buffer.alloc(4)]))).not.toBe('mp4');
    expect(sniff(DOCX)).toBe('docx');
    expect(sniff(XLSX)).toBe('xlsx');
    expect(sniff(Buffer.from('Tên,Giá\nSerum,350000\n'))).toBe('text');
    expect(sniff(EXE)).toBe('executable');
    expect(sniff(Buffer.from('#!/bin/sh\nrm -rf /'))).toBe('executable');
    expect(sniff(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]))).toBe('cfb');
    expect(sniff(Buffer.from('<?xml version="1.0"?><svg onload="alert(1)"/>'))).toBe('markup');
    expect(sniff(Buffer.from([0x00, 0x01, 0x02, 0xfe]))).toBe('unknown');
  });
});

describe('guardUpload', () => {
  it('AC1: .exe đổi tên .pdf → 415; mime khai báo sai nội dung → 415', () => {
    expect(err({ name: 'hop-dong.pdf', mime: 'application/pdf', body: EXE, purpose: 'document' })).toBe('415:executable');
    expect(err({ name: 'anh.png', mime: 'image/png', body: PDF, purpose: 'attachment' })).toBe('415:type_mismatch');
    expect(err({ name: 'a.pdf', mime: 'image/png', body: PDF, purpose: 'attachment' })).toBe('415:type_mismatch');
  });

  it('SVG / HTML giả ảnh, đuôi nguy hiểm / macro-enabled / Office cũ, loại ngoài danh sách purpose → 415', () => {
    expect(err({ name: 'logo.png', mime: 'image/png', body: Buffer.from('<svg onload="x()"/>'), purpose: 'avatar' })).toBe('415:type_not_allowed');
    expect(err({ name: 'logo.svg', mime: 'image/svg+xml', body: Buffer.from('<svg/>'), purpose: 'attachment' })).toBe('415:type_not_allowed');
    expect(err({ name: 'mau.docm', mime: 'application/vnd.ms-word', body: DOCX, purpose: 'document' })).toBe('415:extension_not_allowed');
    expect(err({ name: 'cu.doc', mime: 'application/msword', body: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), purpose: 'kb' })).toBe('415:legacy_or_encrypted_office');
    expect(err({ name: 'clip.mp4', mime: 'video/mp4', body: MP4, purpose: 'document' })).toBe('415:type_not_allowed');
    expect(err({ name: 'a.zip', mime: 'application/zip', body: ooxml({ 'x.txt': 'x' }), purpose: 'attachment' })).toBe('415:unsupported_type');
  });

  it('OOXML: macro / zip bomb / đi ngược thư mục → 422 trước khi giải nén; gói hỏng giả XLSX → 415 unsupported_type', () => {
    expect(err({ name: 'm.docx', mime: DOCX_MIME, body: ooxml({ '[Content_Types].xml': '<Types/>', 'word/document.xml': '<w/>', 'word/vbaProject.bin': 'x' }), purpose: 'document' })).toBe('422:macro');
    expect(err({ name: 'b.xlsx', mime: '', body: ooxml({ '[Content_Types].xml': '<Types/>', 'xl/workbook.xml': '<w/>', 'xl/big.xml': ' '.repeat(5_000_000) }), purpose: 'import' })).toBe('422:zip_bomb');
    expect(err({ name: 't.docx', mime: DOCX_MIME, body: ooxml({ '[Content_Types].xml': '<T/>', 'word/document.xml': '<w/>', '../../evil.sh': 'x' }), purpose: 'kb' })).toBe('422:path_traversal');
    expect(err({ name: 'hong.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from('PK\u0003\u0004 không phải zip'), purpose: 'import' })).toBe('415:unsupported_type');
  });

  it('giới hạn theo loại: ảnh > 10MB, mẫu DOCX > 10MB → 413; rỗng 422; purpose lạ 422', () => {
    expect(err({ name: 'a.png', mime: 'image/png', body: Buffer.concat([PNG, Buffer.alloc(UPLOAD_LIMITS.image)]), purpose: 'attachment' })).toBe('413:too_large');
    expect(err({ name: 'a.pdf', mime: 'application/pdf', body: Buffer.alloc(0), purpose: 'attachment' })).toBe('422:empty');
    expect(err({ name: 'a.pdf', mime: 'application/pdf', body: PDF, purpose: 'public' })).toBe('422:invalid_purpose');
  });

  it('hợp lệ: mime lưu theo nội dung, mime chung chung chấp nhận, CSV / markdown / tiếng Việt giữ nguyên', () => {
    expect(guardUpload({ name: 'Phiếu quà.pdf', mime: 'application/octet-stream', body: PDF, purpose: 'attachment' })).toEqual({ kind: 'pdf', mime: 'application/pdf', name: 'Phiếu quà.pdf' });
    expect(guardUpload({ name: 'khach.csv', mime: 'text/csv', body: Buffer.from('a,b\n1,2'), purpose: 'import' }).mime).toBe('text/csv');
    expect(guardUpload({ name: 'Đổi trả.md', mime: 'text/markdown', body: Buffer.from('# Đổi trả'), purpose: 'kb' }).mime).toBe('text/markdown');
    expect(guardUpload({ name: 'hd.docx', mime: DOCX_MIME, body: DOCX, purpose: 'document' }).kind).toBe('docx');
    expect(guardUpload({ name: 'anh.jpg', mime: 'image/jpeg', body: JPG, purpose: 'attachment' }).mime).toBe('image/jpeg');
  });

  it('tên tệp: bỏ đường dẫn, mã điều khiển / RTL override, NFC', () => {
    expect(normalizeName('..\\..\\windows\\a.pdf')).toBe('a.pdf');
    expect(normalizeName('x‮fdp.exe')).toBe('x_fdp.exe');
    expect(normalizeName('Hóa.pdf')).toBe('Hóa.pdf');
    expect(normalizeName('   ')).toBe('file');
  });
});
