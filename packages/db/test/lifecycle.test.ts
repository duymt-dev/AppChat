// TIP-041 (unit): phong bì mã hoá bản lưu trữ (khứ hồi nhiều khối, nonce không lặp, sửa / cắt / đảo khối / khoá lạ → lỗi), key ring,
// khoá kho chặn đường dẫn lạ, tên DB tạm / khoá advisory, che stderr pg. Native dump / restore / drop ở test/integration/lifecycle.
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { afterAll, describe, expect, it } from 'vitest';
import {
  DecryptStream,
  EncryptStream,
  EnvelopeError,
  LocalArchiveStore,
  archiveKeyOf,
  assertArchiveKey,
  assertTempDbName,
  clusterUrl,
  lockKeyOf,
  parseKeyRing,
  parseToc,
  redactPgStderr,
  restoreTempDbName,
  singleKeyRing,
  tenantDbName,
} from '../src';

const WS = '0190f000-0000-7000-8000-00000000c041';
const K1 = randomBytes(32);
const ring = singleKeyRing('k1', K1);

async function collect(src: Readable, t: NodeJS.ReadWriteStream): Promise<Buffer> {
  const parts: Buffer[] = [];
  const out = new Writable({
    write(c: Buffer, _e, cb) {
      parts.push(c);
      cb();
    },
  });
  await pipeline(src, t, out);
  return Buffer.concat(parts);
}
const encrypt = (plain: Buffer, r = ring) => collect(Readable.from([plain]), new EncryptStream(r.get(r.currentId)!, r.currentId));
const decrypt = (cipher: Buffer, r = ring) => collect(Readable.from([cipher]), new DecryptStream(r));

describe('phong bì AES-256-GCM theo khối', () => {
  it('khứ hồi 0 byte / nhỏ / nhiều khối (2.5 MiB), bản mã không chứa bản rõ', async () => {
    for (const n of [0, 17, Math.floor(2.5 * 1024 * 1024)]) {
      const plain = randomBytes(n);
      const c = await encrypt(plain);
      expect((await decrypt(c)).equals(plain)).toBe(true);
      if (n > 64) expect(c.includes(plain.subarray(0, 64))).toBe(false);
    }
  });

  it('hai lần mã cùng bản rõ → bản mã khác (nonce prefix ngẫu nhiên mỗi bản)', async () => {
    const p = Buffer.from('cùng nội dung');
    expect((await encrypt(p)).equals(await encrypt(p))).toBe(false);
  });

  it('sửa 1 byte / cắt khối cuối / đảo khối / khoá lạ / khoá sai → EnvelopeError, không trả bản rõ hỏng', async () => {
    const plain = randomBytes(2 * 1024 * 1024 + 10);
    const c = await encrypt(plain);
    const flip = Buffer.from(c);
    flip[c.length - 40]! ^= 1;
    await expect(decrypt(flip)).rejects.toBeInstanceOf(EnvelopeError);
    // Cắt đúng ranh giới khối (bỏ khối cuối) → thiếu khối có cờ "cuối".
    const hdr = 4 + 2 + 2 + 8;
    const len0 = c.readUInt32BE(hdr);
    const two = c.subarray(0, hdr + 4 + len0 + 4 + c.readUInt32BE(hdr + 4 + len0));
    await expect(decrypt(two)).rejects.toBeInstanceOf(EnvelopeError);
    // Đảo khối 0 ↔ 1 (cùng độ dài 1 MiB) → nonce / AAD theo thứ tự vỡ.
    const b0 = c.subarray(hdr, hdr + 4 + len0);
    const b1 = c.subarray(hdr + 4 + len0, hdr + 2 * (4 + len0));
    const swapped = Buffer.concat([c.subarray(0, hdr), b1, b0, c.subarray(hdr + 2 * (4 + len0))]);
    await expect(decrypt(swapped)).rejects.toBeInstanceOf(EnvelopeError);
    await expect(decrypt(c, singleKeyRing('k2', randomBytes(32)))).rejects.toMatchObject({ message: expect.stringContaining('key_id') });
    await expect(decrypt(c, singleKeyRing('k1', randomBytes(32)))).rejects.toBeInstanceOf(EnvelopeError);
    await expect(decrypt(Buffer.from('not an archive at all'))).rejects.toBeInstanceOf(EnvelopeError);
  });

  it('key ring nhiều khoá: giải bản cũ bằng khoá cũ sau khi xoay; khoá sai định dạng → ném', async () => {
    const old = parseKeyRing(`k1:${K1.toString('base64')}`, 'k1');
    const c = await encrypt(Buffer.from('bản cũ'), old);
    const rotated = parseKeyRing(`k1:${K1.toString('base64')},k2:${randomBytes(32).toString('base64')}`, 'k2');
    expect(rotated.currentId).toBe('k2');
    expect((await decrypt(c, rotated)).toString()).toBe('bản cũ');
    expect(() => parseKeyRing('k1:abc', 'k1')).toThrow();
    expect(() => parseKeyRing(`k1:${K1.toString('base64')}`, 'k9')).toThrow();
  });
});

describe('kho + tên + khoá', () => {
  const dir = mkdtempSync(join(tmpdir(), 'acar-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('khoá kho chỉ dạng `<ws>/g<n>-<id>.acar`; ghi tạm rồi đổi tên; huỷ không để lại tệp', async () => {
    const store = new LocalArchiveStore(dir);
    const key = archiveKeyOf(WS, 3, '0190f000-0000-7000-8000-0000000000aa');
    expect(() => assertArchiveKey('../etc/passwd')).toThrow();
    expect(() => assertArchiveKey(`${WS}/../../x.acar`)).toThrow();
    expect(() => store.read('a/b')).toThrow();
    const w = store.write(key);
    w.stream.end(Buffer.from('abc'));
    await w.commit();
    expect(await store.size(key)).toBe(3);
    const key2 = archiveKeyOf(WS, 4, '0190f000-0000-7000-8000-0000000000bb');
    const w2 = store.write(key2);
    w2.stream.write(Buffer.from('dở'));
    await w2.abort();
    expect(await store.size(key2)).toBeNull();
    await store.remove(key);
    expect(await store.size(key)).toBeNull();
  });

  it('DB tạm đúng thế hệ của DB tenant; tên lạ (platform / template / postgres) bị chặn', () => {
    const db = tenantDbName(WS);
    expect(restoreTempDbName(db, 7)).toBe(`${db}_r7`);
    for (const bad of ['appchat_platform', 'appchat_tenant_template', 'postgres', `${db}_x1`, `${db}_r`]) expect(() => assertTempDbName(bad)).toThrow();
    expect(() => restoreTempDbName('appchat_platform', 1)).toThrow();
  });

  it('khoá advisory ổn định theo workspace; host ngoài allowlist bị từ chối', () => {
    expect(lockKeyOf(WS)).toBe(lockKeyOf(WS));
    expect(lockKeyOf(WS)).not.toBe(lockKeyOf('0190f000-0000-7000-8000-00000000c042'));
    const c = { adminUrl: 'postgresql://p:pw@db1:5432/postgres', allowedHosts: ['db2'] };
    expect(clusterUrl(c, null, 'x')).toContain('@db1:5432/x');
    expect(clusterUrl(c, 'db2', 'x')).toContain('@db2:5432/x');
    expect(() => clusterUrl(c, 'evil', 'x')).toThrow(/host_not_allowed/);
  });

  it('che mật khẩu / URL trong stderr; TOC đếm bảng', () => {
    expect(redactPgStderr('FATAL: password s3cr3t for postgresql://u:s3cr3t@h/db failed', 's3cr3t')).not.toMatch(/s3cr3t/);
    const toc = parseToc(';\n; Archive\n1; 0 0 EXTENSION - vector\n2; 1 2 TABLE public contact appchat_migrator\n3; 1 3 TABLE DATA public contact appchat_migrator\n');
    expect(toc).toMatchObject({ entries: 3, tables: 1 });
  });
});
