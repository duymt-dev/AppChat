// Đường ghi GenUI qua transport mock + useAction (TIP-023c hợp đồng 3–4): có intent → action không phải đọc LUÔN qua xem trước (kể cả action
// mà nguồn ui chạy thẳng); ô bí mật cất vault ở 202, confirm_token tính trên input đã bỏ bí mật; xác nhận bằng vault (dùng một lần) —
// vault dùng lại → RE_ENTRY_REQUIRED; `withoutPaths` bỏ đúng ô; channel.status mock theo attempt (waiting → scanned → connected) và ảnh
// QR chỉ của attempt hiện hành.
import { beforeEach, describe, expect, it } from 'vitest';
import { withoutPaths } from '../actions/useAction';
import { mockTransport } from '../api/mock/mock-transport';
import { mockDb, setMockRole } from '../api/mock/store';

const EMAIL = { address: 'hotro@spa.vn', fields: { imap_host: 'imap.gmail.com', imap_port: '993', password: 'S3CRET-sentinel' } };

describe('GenUI qua mock transport', () => {
  beforeEach(() => setMockRole('owner'));

  it('intent → preview bắt buộc; vault thay mật khẩu ở lần xác nhận; vault dùng một lần', async () => {
    const first = await mockTransport.action('channel.email.connect', EMAIL, { genuiIntent: 'h1' });
    expect(first.status).toBe(202);
    if (first.status !== 202 || first.data.status !== 'preview_required') throw new Error('expected preview');
    const vault = (first.data as { secret_vault?: string }).secret_vault;
    expect(vault).toMatch(/^sv_/);
    const plain = withoutPaths(EMAIL, ['fields.password']);
    expect(JSON.stringify(plain)).not.toContain('S3CRET');
    const ok = await mockTransport.action('channel.email.connect', plain, { genuiIntent: 'h1', confirmToken: first.data.confirm_token, secretVault: vault });
    expect(ok.status).toBe(200);
    await expect(mockTransport.action('channel.email.connect', plain, { genuiIntent: 'h1', confirmToken: first.data.confirm_token, secretVault: vault })).rejects.toMatchObject({ error: { code: 'CONFLICT', message: 'RE_ENTRY_REQUIRED' } });
  });

  it('không intent (nguồn ui) → policy cũ, chạy thẳng', async () => {
    const r = await mockTransport.action('notification.mark_read', { ids: 'all' });
    expect(r.status).toBe(200);
  });

  it('channel.status: waiting (qr_ref đúng attempt) → scanned → connected; ảnh QR attempt lạ / đã quét → 404', async () => {
    const start = await mockTransport.action<{ channel_account_id: string }>('channel.zalo.start_login', {});
    if (start.status !== 200) throw new Error('start');
    const acc = start.data.result.channel_account_id;
    const st = async () => {
      const r = await mockTransport.action<{ login: { status: string; attempt: string; qr_ref: string | null } }>('channel.status', { channel_account_id: acc });
      if (r.status !== 200) throw new Error('status');
      return r.data.result.login;
    };
    const w = await st();
    expect(w.status).toBe('waiting');
    expect(w.qr_ref).toBe(`/assistant/ui/qr/${acc}?attempt=${w.attempt}`);
    await expect(mockTransport.get(`/assistant/ui/qr/${acc}`, { attempt: 'att_other' })).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(await mockTransport.get(`/assistant/ui/qr/${acc}`, { attempt: w.attempt })).toMatchObject({ png_base64: expect.any(String) });
    await st();
    expect((await st()).status).toBe('scanned');
    await expect(mockTransport.get(`/assistant/ui/qr/${acc}`, { attempt: w.attempt })).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect((await st()).status).toBe('connected');
    expect(mockDb().settingsApps.channels.flatMap((c) => c.accounts).find((a) => a.id === acc)?.connected).toBe(true);
  });

  it('withoutPaths không đổi input gốc', () => {
    const src = { a: { b: 1, c: 2 } };
    expect(withoutPaths(src, ['a.b'])).toEqual({ a: { c: 2 } });
    expect(src).toEqual({ a: { b: 1, c: 2 } });
  });
});
