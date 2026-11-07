// Kho bản lưu trữ DB tenant (TIP-041 §2, DC-375): phong bì mã hoá luồng AES-256-GCM theo khối + kho tệp cục bộ có gốc cố định.
// Phong bì v1: "ACAR" | ver(1) | len(key_id)(1) | key_id | nonce_prefix(8) | khối*; khối = len(4, BE) | cipher | tag(16). Nonce mỗi khối =
// prefix ngẫu nhiên (mỗi bản) ‖ số thứ tự (4) — không tái sử dụng với cùng khoá. AAD = header ‖ số thứ tự ‖ cờ khối cuối → cắt cụt / đảo
// khối / đổi header đều vỡ tag. Khoá lấy từ key ring (id → 32 byte) do cấu hình bí mật cấp — không ghi khoá vào bản lưu trữ / manifest.
// Không đọc cả dump vào RAM: mã / giải từng khối 1 MiB.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, type WriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { PassThrough, Transform, type Readable, type TransformCallback, type Writable } from 'node:stream';

export const ENVELOPE_VERSION = 1;
const MAGIC = Buffer.from('ACAR');
const CHUNK = 1024 * 1024;

export interface KeyRing {
  /** Khoá dùng mã bản mới. */
  currentId: string;
  get(id: string): Buffer | undefined;
}

/** `ARCHIVE_KEYS` = "id1:<base64 32 byte>,id2:<…>", `ARCHIVE_KEY_ID` = id hiện hành. Sai định dạng → ném (dừng boot). */
export function parseKeyRing(spec: string, currentId: string): KeyRing {
  const keys = new Map<string, Buffer>();
  for (const part of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = part.indexOf(':');
    const id = part.slice(0, i);
    const key = Buffer.from(part.slice(i + 1), 'base64');
    if (i <= 0 || !/^[A-Za-z0-9._-]{1,40}$/.test(id) || key.length !== 32) throw new Error('ARCHIVE_KEYS sai định dạng (id:base64 32 byte)');
    keys.set(id, key);
  }
  if (!keys.has(currentId)) throw new Error('ARCHIVE_KEY_ID không có trong ARCHIVE_KEYS');
  return { currentId, get: (id) => keys.get(id) };
}

/** Một khoá duy nhất (dẫn xuất từ bí mật của triển khai) — dev / test khi chưa cấp ARCHIVE_KEYS riêng. */
export const singleKeyRing = (id: string, key: Buffer): KeyRing => {
  if (key.length !== 32) throw new Error('khoá lưu trữ phải 32 byte');
  return { currentId: id, get: (k) => (k === id ? key : undefined) };
};

const aad = (header: Buffer, seq: number, last: boolean) => {
  const b = Buffer.alloc(5);
  b.writeUInt32BE(seq, 0);
  b[4] = last ? 1 : 0;
  return Buffer.concat([header, b]);
};
const nonceOf = (prefix: Buffer, seq: number) => {
  const n = Buffer.alloc(12);
  prefix.copy(n, 0);
  n.writeUInt32BE(seq, 8);
  return n;
};

/** Hàng byte không nối lại cả bộ đệm mỗi lần nhận (dump GB → không copy bậc hai). */
class Bytes {
  private parts: Buffer[] = [];
  length = 0;
  push(b: Buffer) {
    if (!b.length) return;
    this.parts.push(b);
    this.length += b.length;
  }
  /** n byte đầu (gộp tối thiểu các phần cần). */
  peek(n: number): Buffer {
    if (this.parts[0] && this.parts[0].length >= n) return this.parts[0].subarray(0, n);
    const b = Buffer.concat(this.parts, this.length);
    this.parts = [b];
    return b.subarray(0, n);
  }
  take(n: number): Buffer {
    const b = this.peek(n);
    const head = this.parts[0]!;
    if (head.length === n) this.parts.shift();
    else this.parts[0] = head.subarray(n);
    this.length -= n;
    return b;
  }
}

/** Luồng mã hoá: giữ lại một khối để biết khối nào là cuối (cờ trong AAD). */
export class EncryptStream extends Transform {
  readonly header: Buffer;
  private readonly prefix = randomBytes(8);
  private readonly pending = new Bytes();
  private seq = 0;

  constructor(
    private readonly key: Buffer,
    keyId: string,
  ) {
    super();
    const id = Buffer.from(keyId, 'utf8');
    this.header = Buffer.concat([MAGIC, Buffer.from([ENVELOPE_VERSION, id.length]), id, this.prefix]);
    this.push(this.header);
  }

  private seal(plain: Buffer, last: boolean) {
    if (this.seq >= 0xffffffff) throw new Error('bản lưu trữ quá lớn');
    const c = createCipheriv('aes-256-gcm', this.key, nonceOf(this.prefix, this.seq));
    c.setAAD(aad(this.header, this.seq, last));
    const body = Buffer.concat([c.update(plain), c.final(), c.getAuthTag()]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    this.push(Buffer.concat([len, body]));
    this.seq++;
  }

  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
    try {
      this.pending.push(chunk);
      while (this.pending.length > CHUNK) this.seal(this.pending.take(CHUNK), false);
      cb();
    } catch (e) {
      cb(e as Error);
    }
  }

  override _flush(cb: TransformCallback) {
    try {
      this.seal(this.pending.take(this.pending.length), true);
      cb();
    } catch (e) {
      cb(e as Error);
    }
  }
}

export class EnvelopeError extends Error {
  constructor(reason: string) {
    super(`bản lưu trữ không hợp lệ: ${reason}`);
    this.name = 'EnvelopeError';
  }
}

/** Luồng giải mã — tag sai / thiếu khối cuối / khoá lạ → EnvelopeError (không xuất phần đã giải của khối hỏng). */
export class DecryptStream extends Transform {
  private readonly buf = new Bytes();
  private header: Buffer | null = null;
  private prefix: Buffer | null = null;
  private key: Buffer | null = null;
  private seq = 0;
  private done = false;
  keyId: string | null = null;

  constructor(private readonly ring: KeyRing) {
    super();
  }

  private parseHeader(): boolean {
    if (this.buf.length < 6) return false;
    const h = this.buf.peek(6);
    if (!h.subarray(0, 4).equals(MAGIC)) throw new EnvelopeError('magic');
    if (h[4] !== ENVELOPE_VERSION) throw new EnvelopeError('version');
    const idLen = h[5]!;
    const end = 6 + idLen + 8;
    if (this.buf.length < end) return false;
    this.header = Buffer.from(this.buf.take(end));
    this.keyId = this.header.subarray(6, 6 + idLen).toString('utf8');
    this.key = this.ring.get(this.keyId) ?? null;
    if (!this.key) throw new EnvelopeError('key_id');
    this.prefix = this.header.subarray(6 + idLen, end);
    return true;
  }

  /** Mở các khối đủ dữ liệu; khối cuối chỉ biết khi đã hết luồng (`final`). */
  private drain(final: boolean) {
    for (;;) {
      if (this.buf.length < 4) break;
      const len = this.buf.peek(4).readUInt32BE(0);
      if (len < 16 || len > CHUNK + 16) throw new EnvelopeError('chunk_len');
      if (this.buf.length < 4 + len) break;
      // Khối vừa đủ phần còn lại: chưa hết luồng thì chờ (có thể là khối cuối); hết luồng → khối cuối.
      if (!final && this.buf.length === 4 + len) break;
      const last = final && this.buf.length === 4 + len;
      const body = this.buf.take(4 + len).subarray(4);
      const d = createDecipheriv('aes-256-gcm', this.key!, nonceOf(this.prefix!, this.seq));
      d.setAAD(aad(this.header!, this.seq, last));
      d.setAuthTag(body.subarray(len - 16));
      const plain = Buffer.concat([d.update(body.subarray(0, len - 16)), d.final()]);
      this.push(plain);
      this.seq++;
      if (last) {
        this.done = true;
        break;
      }
    }
  }

  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
    try {
      this.buf.push(chunk);
      if (!this.header && !this.parseHeader()) return cb();
      this.drain(false);
      cb();
    } catch (e) {
      cb(e instanceof EnvelopeError ? e : new EnvelopeError('auth'));
    }
  }

  override _flush(cb: TransformCallback) {
    try {
      if (!this.header) throw new EnvelopeError('truncated');
      this.drain(true);
      if (!this.done || this.buf.length) throw new EnvelopeError('truncated');
      cb();
    } catch (e) {
      cb(e instanceof EnvelopeError ? e : new EnvelopeError('auth'));
    }
  }
}

/** Đếm byte + sha256 của luồng đi qua (không đổi dữ liệu). */
export class HashTap extends Transform {
  private readonly h = createHash('sha256');
  bytes = 0;
  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
    this.h.update(chunk);
    this.bytes += chunk.length;
    cb(null, chunk);
  }
  digest(): string {
    return this.h.digest('hex');
  }
}

const KEY = /^[0-9a-f-]{36}\/g\d{1,9}-[0-9a-f-]{36}\.acar$/;

/** Khoá kho của một bản: `<workspace>/g<generation>-<manifest>.acar` — sinh phía server, kiểm dạng trước mọi thao tác tệp. */
export const archiveKeyOf = (workspaceId: string, generation: number, manifestId: string) => `${workspaceId}/g${generation}-${manifestId}.acar`;
export const assertArchiveKey = (key: string) => {
  if (!KEY.test(key)) throw new Error('khoá bản lưu trữ không hợp lệ');
  return key;
};

export interface ArchiveStore {
  /** Ghi vào tệp tạm rồi đổi tên khi xong (không để lại bản dở dưới khoá thật). */
  write(key: string): { stream: Writable; commit: () => Promise<void>; abort: () => Promise<void> };
  read(key: string): Readable;
  size(key: string): Promise<number | null>;
  remove(key: string): Promise<void>;
}

/** Kho tệp cục bộ (`ARCHIVE_DIR`, mặc định `.data/archives`) — đường dẫn luôn nằm dưới gốc (chặn ../, khoá lạ). */
export class LocalArchiveStore implements ArchiveStore {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string): string {
    const p = resolve(this.root, ...assertArchiveKey(key).split('/'));
    if (!p.startsWith(this.root + sep)) throw new Error('khoá bản lưu trữ ngoài thư mục gốc');
    return p;
  }

  write(key: string) {
    const final = this.path(key);
    const tmp = `${final}.${randomBytes(4).toString('hex')}.part`;
    const stream = new PassThrough();
    let out: WriteStream | null = null;
    let aborted = false;
    const opened = (async () => {
      await mkdir(dirname(final), { recursive: true });
      const o = createWriteStream(tmp, { flags: 'wx', mode: 0o600 });
      out = o;
      await new Promise<void>((res, rej) => {
        o.on('close', () => (aborted ? rej(new Error('aborted')) : res()));
        o.on('error', rej);
        stream.on('error', rej);
        // Huỷ trước / trong khi mở tệp: đóng tệp ngay (luồng nguồn đã huỷ không bao giờ 'end').
        if (aborted) o.destroy();
        else stream.pipe(o);
      });
    })();
    opened.catch(() => undefined);
    return {
      stream,
      commit: async () => {
        await opened;
        await rename(tmp, final);
      },
      abort: async () => {
        aborted = true;
        stream.unpipe();
        stream.destroy();
        (out as WriteStream | null)?.destroy();
        await opened.catch(() => undefined);
        await rm(tmp, { force: true });
      },
    };
  }

  read(key: string): Readable {
    return createReadStream(this.path(key));
  }

  async size(key: string): Promise<number | null> {
    return stat(this.path(key)).then(
      (s) => s.size,
      () => null,
    );
  }

  async remove(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}
