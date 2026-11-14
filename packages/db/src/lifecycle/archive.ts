// Bản lưu trữ DB tenant (TIP-041 §2, Blueprint §2.0 bước 5): pg_dump -Fc → (sha256 bản rõ) → mã hoá luồng → (sha256 bản mã) → kho; rồi
// ĐỌC LẠI từ kho → kiểm sha256 bản mã → giải mã → kiểm sha256 bản rõ + `pg_restore -l` (danh mục đủ bảng). Chỉ khi mọi kiểm đạt mới
// trả bằng chứng cho lớp gọi ghi manifest; DROP là bước riêng của lớp điều phối (sau khi manifest đã commit). Không đọc cả dump vào RAM.
// `pg_restore -l` chỉ chứng minh danh mục đọc được — dữ liệu khôi phục được chứng minh bằng restore thử (test gate), không suy từ -l.
import { pipeline } from 'node:stream/promises';
import { assertTenantDbName } from '../db-name';
import { DecryptStream, EncryptStream, HashTap, type ArchiveStore, type KeyRing } from './archive-storage';
import type { OperationLock } from './operation-lock';
import { runPg, type PgConn } from './pg-process';

export interface ArchiveDeps {
  store: ArchiveStore;
  keys: KeyRing;
  /** Kết nối pg_dump / pg_restore (role provisioner) tới DB nguồn. */
  conn: (database: string) => PgConn;
  binDir?: string;
}

export interface ArchiveProof {
  checksum: string;
  sizeBytes: number;
  cipherChecksum: string;
  cipherBytes: number;
  tocEntries: number;
  tableCount: number;
  encryptionKeyId: string;
}

export class ArchiveVerifyError extends Error {
  constructor(readonly check: 'cipher_checksum' | 'checksum' | 'catalog' | 'size' | 'tables') {
    super(`kiểm bản lưu trữ thất bại: ${check}`);
    this.name = 'ArchiveVerifyError';
  }
}

/** TOC của `pg_restore -l`: mục dữ liệu (dòng không phải chú thích) + số `TABLE DATA`. */
export function parseToc(toc: string): { entries: number; tables: number; lines: string[] } {
  const lines = toc.split(/\r?\n/).filter((l) => l && !l.startsWith(';'));
  return { entries: lines.length, tables: lines.filter((l) => / TABLE public /.test(l)).length, lines };
}

/** Đọc lại bản trong kho, giải mã, chạy `pg_restore -l` trên luồng — trả TOC + checksum đã thấy. */
export async function readBack(d: Pick<ArchiveDeps, 'store' | 'keys' | 'binDir'>, key: string, conn: PgConn, signal?: AbortSignal) {
  const cipher = new HashTap();
  const plain = new HashTap();
  const dec = new DecryptStream(d.keys);
  const src = d.store.read(key);
  src.pipe(cipher).pipe(dec).pipe(plain);
  const failed = new Promise<never>((_, rej) => {
    for (const s of [src, cipher, dec, plain]) s.on('error', rej);
  });
  const toc = await Promise.race([runPg('pg_restore', ['-l'], conn, { binDir: d.binDir, stdin: plain, signal }), failed]);
  return { toc: parseToc(toc), cipherChecksum: cipher.digest(), cipherBytes: cipher.bytes, checksum: plain.digest(), sizeBytes: plain.bytes, keyId: dec.keyId };
}

/**
 * Dump DB tenant `dbName` vào kho dưới `key` (đang giữ `lock`) rồi kiểm đọc lại. `expectTables` = số bảng public đếm ở DB nguồn ngay trước
 * dump (nguồn đã quiesce). Lỗi bất kỳ → xoá tệp dở, ném; DB nguồn không bị đụng.
 */
export async function dumpAndVerify(d: ArchiveDeps, lock: OperationLock, dbName: string, key: string, expectTables: number): Promise<ArchiveProof> {
  assertTenantDbName(dbName);
  await lock.assertHeld();
  const conn = d.conn(dbName);
  const plain = new HashTap();
  const enc = new EncryptStream(d.keys.get(d.keys.currentId)!, d.keys.currentId);
  const cipher = new HashTap();
  const w = d.store.write(key);
  try {
    // -Fc nén sẵn; --no-owner: owner khi khôi phục = role migrator (không phụ thuộc role cũ). Giữ ACL / default ACL (quyền tenant_app).
    const dumping = runPg('pg_dump', ['-Fc', '--no-owner', '-d', dbName], conn, { binDir: d.binDir, stdout: plain, signal: lock.signal });
    const piping = pipeline(plain, enc, cipher, w.stream);
    await Promise.all([dumping, piping]);
    await w.commit();
  } catch (e) {
    await w.abort();
    throw e;
  }
  await lock.assertHeld();
  try {
    const back = await readBack(d, key, conn, lock.signal);
    if ((await d.store.size(key)) !== cipher.bytes || back.cipherBytes !== cipher.bytes) throw new ArchiveVerifyError('size');
    if (back.cipherChecksum !== cipher.digest()) throw new ArchiveVerifyError('cipher_checksum');
    if (back.checksum !== plain.digest() || back.sizeBytes !== plain.bytes) throw new ArchiveVerifyError('checksum');
    if (!back.toc.entries) throw new ArchiveVerifyError('catalog');
    if (back.toc.tables < expectTables) throw new ArchiveVerifyError('tables');
    return {
      checksum: back.checksum,
      sizeBytes: back.sizeBytes,
      cipherChecksum: back.cipherChecksum,
      cipherBytes: back.cipherBytes,
      tocEntries: back.toc.entries,
      tableCount: back.toc.tables,
      encryptionKeyId: d.keys.currentId,
    };
  } catch (e) {
    await d.store.remove(key).catch(() => undefined);
    throw e;
  }
}

/** Số bảng public của DB (đếm trước dump để so với danh mục). */
export const TABLE_COUNT_SQL = `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`;
