// TIP-045b annex B / DV-019 — Storage S3-compatible: put / get / delete riêng tư qua SDK thật tới máy chủ S3 giả trên loopback (path-style,
// kiểm chữ ký có mặt, ACL private, tiền tố), khoá xấu bị chặn trước mạng, không tìm thấy → storage_not_found, lỗi nhà cung cấp →
// storage_unavailable không lộ thông điệp, đọc vượt trần → storage_too_large; cấu hình env: local mặc định, s3 thiếu biến dừng boot,
// endpoint http ngoài loopback bị từ chối, thông báo lỗi không chứa giá trị bí mật.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { LocalStorage } from '../src/kernel/files/storage';
import { S3Storage, StorageError, checkStorageKey } from '../src/kernel/files/s3-storage';
import { storageFromEnv } from '../src/kernel/files/storage-config';

const objects = new Map<string, Buffer>();
const seen: { method: string; path: string; acl?: string; signed: boolean }[] = [];
let srv: Server;
let endpoint: string;
let failNext = false;

const body = (req: IncomingMessage) =>
  new Promise<Buffer>((ok) => {
    const parts: Buffer[] = [];
    req.on('data', (c: Buffer) => parts.push(c));
    req.on('end', () => ok(Buffer.concat(parts)));
  });

beforeAll(async () => {
  srv = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '').split('?')[0]!);
    seen.push({ method: req.method!, path, acl: req.headers['x-amz-acl'] as string | undefined, signed: String(req.headers.authorization ?? '').startsWith('AWS4-HMAC-SHA256') });
    if (failNext) {
      failNext = false;
      res.statusCode = 500;
      res.end('<Error><Code>InternalError</Code><Message>secret-endpoint-detail</Message></Error>');
      return;
    }
    if (req.method === 'PUT') {
      let b = await body(req);
      // SDK có thể gửi aws-chunked; máy chủ giả chỉ cần chunked thô khi có header này.
      if (req.headers['content-encoding']?.includes('aws-chunked')) b = Buffer.from(b.toString('latin1').replace(/^[0-9a-f]+;chunk-signature=[0-9a-f]+\r\n|\r\n0;chunk-signature=[0-9a-f]+\r\n\r\n$/g, ''), 'latin1');
      objects.set(path, b);
      res.setHeader('etag', '"x"');
      res.end();
      return;
    }
    if (req.method === 'GET') {
      const o = objects.get(path);
      if (!o) {
        res.statusCode = 404;
        res.setHeader('content-type', 'application/xml');
        res.end('<Error><Code>NoSuchKey</Code><Message>no</Message></Error>');
        return;
      }
      res.setHeader('content-length', String(o.length));
      res.end(o);
      return;
    }
    if (req.method === 'DELETE') {
      objects.delete(path);
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 405;
    res.end();
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', () => ok()));
  endpoint = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((ok) => srv.close(() => ok())));

const s3 = (over: Partial<ConstructorParameters<typeof S3Storage>[0]> = {}) =>
  new S3Storage({ bucket: 'appchat-files', region: 'auto', endpoint, accessKeyId: 'AKTEST', secretAccessKey: 'sk-test-secret', forcePathStyle: true, prefix: 'prod', ...over });

const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: unknown) => (e instanceof StorageError ? e.code : `other:${String(e)}`));

describe('S3Storage qua SDK thật', () => {
  it('put → get → delete, path-style + tiền tố, có chữ ký, ACL private', async () => {
    const st = s3();
    const key = 'ws_1/2026/11/0198f3a2-7c1d-7e55-9a10-3b2c4d5e6f70';
    await st.put(key, Buffer.from('%PDF-1.4 nội dung'));
    const put = seen.find((s) => s.method === 'PUT')!;
    expect(put.path).toBe(`/appchat-files/prod/${key}`);
    expect(put.acl).toBe('private');
    expect(put.signed).toBe(true);
    expect((await st.get(key)).toString()).toBe('%PDF-1.4 nội dung');
    await st.delete(key);
    expect(await code(st.get(key))).toBe('storage_not_found');
    // Xoá lại khoá không còn — idempotent.
    expect(await code(st.delete(key))).toBe('ok');
  });

  it('khoá xấu bị chặn trước khi gọi mạng', async () => {
    const before = seen.length;
    for (const k of ['../etc/passwd', '/abs', 'a/../b', 'a//b', 'a/b c', '']) expect(await code(s3().put(k, Buffer.from('x')))).toBe('storage_bad_key');
    expect(seen.length).toBe(before);
    expect(checkStorageKey('ws/2026/01/id')).toBe('ws/2026/01/id');
  });

  it('lỗi nhà cung cấp → storage_unavailable, không lộ thông điệp SDK', async () => {
    failNext = true;
    const st = new S3Storage({ bucket: 'appchat-files', region: 'auto', endpoint, accessKeyId: 'AKTEST', secretAccessKey: 'sk', forcePathStyle: true });
    const e = await st.get('ws/a').catch((x: unknown) => x as StorageError);
    expect(e).toBeInstanceOf(StorageError);
    expect((e as StorageError).code).toMatch(/storage_unavailable|storage_not_found/);
    expect((e as StorageError).message).not.toContain('secret-endpoint-detail');
  });

  it('vượt trần byte khi ghi / đọc → storage_too_large', async () => {
    const small = s3({ maxBytes: 8 });
    expect(await code(small.put('ws/big', Buffer.alloc(9)))).toBe('storage_too_large');
    await s3().put('ws/big2', Buffer.alloc(32));
    expect(await code(small.get('ws/big2'))).toBe('storage_too_large');
  });
});

describe('cấu hình storage theo env', () => {
  it('mặc định local; s3 đủ biến → S3Storage', () => {
    expect(storageFromEnv({})).toBeInstanceOf(LocalStorage);
    expect(storageFromEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'appchat-files', S3_REGION: 'auto', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 'b', S3_ENDPOINT: 'https://s3.example.com' })).toBeInstanceOf(S3Storage);
  });

  it('s3 thiếu biến / endpoint http ngoài loopback → dừng boot; thông báo chỉ tên biến', () => {
    expect(() => storageFromEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'appchat-files' })).toThrow(/S3_REGION.*S3_ACCESS_KEY_ID.*S3_SECRET_ACCESS_KEY/);
    let msg = '';
    try {
      storageFromEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'appchat-files', S3_REGION: 'auto', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 'top-secret-value', S3_ENDPOINT: 'http://s3.example.com' });
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toContain('S3_ENDPOINT');
    expect(msg).not.toContain('top-secret-value');
    expect(storageFromEnv({ STORAGE_DRIVER: 's3', S3_BUCKET: 'appchat-files', S3_REGION: 'auto', S3_ACCESS_KEY_ID: 'a', S3_SECRET_ACCESS_KEY: 'b', S3_ENDPOINT: 'http://127.0.0.1:9000' })).toBeInstanceOf(S3Storage);
    expect(() => storageFromEnv({ STORAGE_DRIVER: 'ftp' })).toThrow(/STORAGE_DRIVER/);
  });
});
