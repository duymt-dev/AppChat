// Storage S3-compatible (Blueprint §11 "Object storage — s3 chỉ đổi env", TIP-045b annex B, DV-019): put / get / delete riêng tư qua
// `@aws-sdk/client-s3` — không presign, không ACL công khai (`private`), khoá đi qua cùng kiểm hình dạng như local (không `..`, không
// `/` đầu, ký tự an toàn). Đọc giới hạn byte (tệp lớn hơn trần tải lên là bất thường → lỗi, không đọc hết vào RAM). Lỗi nhà cung cấp
// đổi thành mã ổn định `storage_unavailable` / `storage_not_found`, không lộ endpoint / bucket / thông điệp SDK ra client.
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { MAX_UPLOAD_BYTES, assertWorkspacePrefix, type Storage } from './storage';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** MinIO / Ceph / R2 kiểu path (`endpoint/bucket/key`). */
  forcePathStyle?: boolean;
  /** Tiền tố trong bucket (vd `appchat/prod`), không `/` đầu / cuối. */
  prefix?: string;
  timeoutMs?: number;
  maxBytes?: number;
}

/** Lỗi storage đã chuẩn hoá — `cause` giữ để log server, không đưa ra response. */
export class StorageError extends Error {
  constructor(
    readonly code: 'storage_unavailable' | 'storage_not_found' | 'storage_too_large' | 'storage_bad_key',
    override readonly cause?: unknown,
  ) {
    super(code);
  }
}

const KEY = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;

export function checkStorageKey(key: string): string {
  if (!KEY.test(key) || key.split('/').some((s) => s === '.' || s === '..') || key.length > 512) throw new StorageError('storage_bad_key');
  return key;
}

type Sendable = Pick<S3Client, 'send'>;

export class S3Storage implements Storage {
  private readonly client: Sendable;
  private readonly maxBytes: number;

  constructor(
    private readonly cfg: S3StorageConfig,
    client?: Sendable,
  ) {
    const opts: S3ClientConfig = {
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      requestHandler: { requestTimeout: cfg.timeoutMs ?? 15_000, connectionTimeout: 5_000 },
      maxAttempts: 3,
    };
    this.client = client ?? new S3Client(opts);
    this.maxBytes = cfg.maxBytes ?? MAX_UPLOAD_BYTES * 2;
  }

  private objectKey(key: string): string {
    checkStorageKey(key);
    return this.cfg.prefix ? `${this.cfg.prefix}/${key}` : key;
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    if (body.byteLength > this.maxBytes) throw new StorageError('storage_too_large');
    const Key = this.objectKey(key);
    await this.client
      .send(new PutObjectCommand({ Bucket: this.cfg.bucket, Key, Body: body, ContentLength: body.byteLength, ContentType: 'application/octet-stream', ACL: 'private' }))
      .catch((e: unknown) => {
        throw new StorageError('storage_unavailable', e);
      });
  }

  async get(key: string): Promise<Buffer> {
    const Key = this.objectKey(key);
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key })).catch((e: unknown) => {
      throw new StorageError(notFound(e) ? 'storage_not_found' : 'storage_unavailable', e);
    });
    if (out.ContentLength !== undefined && out.ContentLength > this.maxBytes) throw new StorageError('storage_too_large');
    const body = out.Body as AsyncIterable<Uint8Array> | undefined;
    if (!body) return Buffer.alloc(0);
    const parts: Buffer[] = [];
    let n = 0;
    try {
      for await (const chunk of body) {
        n += chunk.byteLength;
        if (n > this.maxBytes) throw new StorageError('storage_too_large');
        parts.push(Buffer.from(chunk));
      }
    } catch (e) {
      if (e instanceof StorageError) throw e;
      throw new StorageError('storage_unavailable', e);
    }
    return Buffer.concat(parts, n);
  }

  async delete(key: string): Promise<void> {
    const Key = this.objectKey(key);
    // S3 trả 204 cả khi khoá không tồn tại — xoá là idempotent như local (`rm force`).
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key })).catch((e: unknown) => {
      if (notFound(e)) return;
      throw new StorageError('storage_unavailable', e);
    });
  }

  deleteWorkspace(workspaceId: string): Promise<number> {
    return deleteS3Workspace(this.client, this.cfg.bucket, this.cfg.prefix, workspaceId);
  }
}

/** Liệt kê theo trang 1000 khoá dưới `<prefix>/<ws>/` rồi xoá lô — chỉ trong tiền tố của workspace. */
export async function deleteS3Workspace(client: Sendable, bucket: string, prefix: string | undefined, workspaceId: string): Promise<number> {
  const root = `${prefix ? `${prefix}/` : ''}${assertWorkspacePrefix(workspaceId)}/`;
  let token: string | undefined;
  let n = 0;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: root, ContinuationToken: token, MaxKeys: 1000 })).catch((e: unknown) => {
      throw new StorageError('storage_unavailable', e);
    });
    const keys = (page.Contents ?? []).map((o) => o.Key!).filter((k) => k.startsWith(root));
    if (keys.length)
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } })).catch((e: unknown) => {
        throw new StorageError('storage_unavailable', e);
      });
    n += keys.length;
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return n;
}

const notFound = (e: unknown) => {
  const x = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return x?.name === 'NoSuchKey' || x?.name === 'NotFound' || x?.$metadata?.httpStatusCode === 404;
};
