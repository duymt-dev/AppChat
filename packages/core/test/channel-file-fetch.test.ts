// TIP-045b annex B — tệp đính kèm gửi ra kênh: link ký nội bộ (đúng origin API + route + chữ ký) đọc thẳng Storage của đúng workspace,
// không gọi HTTP (kể cả khi origin API là localhost); chữ ký sai / route khác / origin khác không được coi là tệp nội bộ; URL ngoài trỏ
// mạng nội bộ / metadata bị safeFetch chặn; adapter Zalo / IMAP không được cấp fetcher thì từ chối (fail closed).
import { describe, expect, it } from 'vitest';
import { ZaloPersonalAdapter, refuseFileFetch } from '@appchat/channels';
import { attachmentFetcher } from '../src/channels/services/attachment-fetcher';
import { parseSignedFileUrl, signedFileUrl } from '../src/kernel/files/signed-url';

const KEY = Buffer.alloc(32, 7);
const WS = '0190f000-0000-7000-8000-000000000001';
const FILE = '0190f000-0000-7000-8000-0000000000f1';
const API = 'http://localhost:4117';

const deps = (reads: string[]) => ({
  apiBase: API,
  key: KEY,
  tenants: { get: async (ctx: { workspaceId: string }) => ({ ws: ctx.workspaceId }) } as never,
  files: {
    read: async (db: { ws: string }, id: string) => {
      reads.push(`${db.ws}/${id}`);
      return id === FILE ? { row: { id, name: 'a.pdf', mime: 'application/pdf', size: 4, sha256: '' }, body: Buffer.from('%PDF') } : null;
    },
  } as never,
});

describe('link ký nội bộ', () => {
  it('đúng origin + route + chữ ký → { ws, fileId }; sai bất kỳ → null', () => {
    const url = signedFileUrl(API, KEY, WS, FILE);
    expect(parseSignedFileUrl(url, API, KEY)).toEqual({ ws: WS, fileId: FILE });
    expect(parseSignedFileUrl(url, API, KEY, WS)).not.toBeNull();
    expect(parseSignedFileUrl(url, API, KEY, '0190f000-0000-7000-8000-000000000002')).toBeNull();
    expect(parseSignedFileUrl(url.replace('sig=', 'sig=x'), API, KEY)).toBeNull();
    expect(parseSignedFileUrl(url.replace('localhost:4117', 'evil.test'), API, KEY)).toBeNull();
    expect(parseSignedFileUrl(url.replace('/raw', '/raw/'), API, KEY)).toBeNull();
    expect(parseSignedFileUrl(`${url}#x`, API, KEY)).toBeNull();
  });

  it('fetcher đọc Storage của đúng workspace, không mở HTTP', async () => {
    const reads: string[] = [];
    const body = await attachmentFetcher(deps(reads))(signedFileUrl(API, KEY, WS, FILE));
    expect(body.toString()).toBe('%PDF');
    expect(reads).toEqual([`${WS}/${FILE}`]);
  });

  it('tệp ký đúng nhưng đã xoá → attachment_not_found', async () => {
    const other = '0190f000-0000-7000-8000-0000000000f2';
    await expect(attachmentFetcher(deps([]))(signedFileUrl(API, KEY, WS, other))).rejects.toThrow('attachment_not_found');
  });
});

describe('URL ngoài qua safeFetch', () => {
  it('localhost (không có chữ ký) / IP nội bộ / metadata → từ chối, không đọc Storage', async () => {
    const reads: string[] = [];
    const f = attachmentFetcher(deps(reads));
    for (const u of [`${API}/v1/files/${FILE}/raw?ws=${WS}&sig=bad`, 'http://127.0.0.1/a.png', 'http://169.254.169.254/latest/meta-data', 'http://10.0.0.8/x.jpg', 'http://[::1]/x']) {
      await expect(f(u), u).rejects.toThrow(/attachment_refused/);
    }
    expect(reads).toEqual([]);
  });
});

describe('fail closed', () => {
  it('Zalo không được cấp fetcher → gửi tệp bị từ chối; refuseFileFetch luôn lỗi', async () => {
    await expect(refuseFileFetch('https://example.com/a.png')).rejects.toThrow('attachment_fetcher_not_configured');
    const adapter = new ZaloPersonalAdapter({} as never);
    expect((adapter as unknown as { files: unknown }).files).toBe(refuseFileFetch);
  });
});
