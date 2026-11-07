// TIP-004: adapter mail (Brevo) + tax_lookup (VietQR / mock) — fetch giả, không gọi mạng (provider-ports §9).
import { describe, expect, it } from 'vitest';
import { BrevoMailProvider, MailSendError, MemoryMailProvider, MockBankFeedProvider, MockTaxLookupProvider, VietQrTaxLookupProvider, mockSignature, normalizeTaxCode } from '../src';
import { sepayManifest } from '../src/connectors/sepay/manifest';

const msg = { to: 'a@b.vn', subject: 'S', html: '<b>x</b>', text: 'x', tag: 'otp' };
const jsonRes = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('BrevoMailProvider', () => {
  it('gửi đúng endpoint + header api-key + tags; trả messageId', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const p = new BrevoMailProvider({
      apiKey: 'k-123',
      sender: { email: 'no-reply@appchat.vn', name: 'AppChat' },
      fetch: (async (url: string, init: RequestInit) => {
        seen = { url, init };
        return jsonRes(201, { messageId: '<m1>' });
      }) as typeof fetch,
    });
    expect(await p.send(msg)).toEqual({ id: '<m1>' });
    expect(seen!.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((seen!.init.headers as Record<string, string>)['api-key']).toBe('k-123');
    expect(JSON.parse(String(seen!.init.body))).toMatchObject({ to: [{ email: 'a@b.vn' }], tags: ['otp'], sender: { name: 'AppChat' } });
  });

  it('HTTP lỗi → MailSendError (không lộ key)', async () => {
    const p = new BrevoMailProvider({ apiKey: 'k-secret', sender: { email: 'x@y.z', name: 'x' }, fetch: (async () => jsonRes(401, {})) as unknown as typeof fetch });
    const err = await p.send(msg).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(MailSendError);
    expect(String((err as Error).message)).not.toContain('k-secret');
  });
});

describe('tax lookup', () => {
  it('normalizeTaxCode: 10 / 13 số, bỏ gạch nối; sai → null', () => {
    expect(normalizeTaxCode('0312345678')).toBe('0312345678');
    expect(normalizeTaxCode('0312345678-001')).toBe('0312345678001');
    expect(normalizeTaxCode('12345')).toBeNull();
  });

  it('VietQR: code 00 → map tên + địa chỉ; code khác / HTTP lỗi / mạng lỗi → null', async () => {
    const ok = new VietQrTaxLookupProvider({
      fetch: (async (url: string) => {
        expect(url).toBe('https://api.vietqr.io/v2/business/0312345678');
        return jsonRes(200, { code: '00', data: { name: 'CÔNG TY A', address: 'Q1' } });
      }) as unknown as typeof fetch,
    });
    expect(await ok.lookup('0312345678')).toMatchObject({ legal_name: 'CÔNG TY A', address: 'Q1', representative: '' });
    const miss = new VietQrTaxLookupProvider({ fetch: (async () => jsonRes(200, { code: '52', data: null })) as unknown as typeof fetch });
    expect(await miss.lookup('0312345678')).toBeNull();
    const down = new VietQrTaxLookupProvider({ fetch: (async () => { throw new Error('ECONNRESET'); }) as unknown as typeof fetch });
    expect(await down.lookup('0312345678')).toBeNull();
    expect(await ok.lookup('abc')).toBeNull();
  });

  it('mock: theo bảng; fallbackFirst như prototype', async () => {
    const row = { legal_name: 'A', address: 'B', representative: 'C', phone: '', founded_on: '', legal_status: '' };
    expect(await new MockTaxLookupProvider({ '0312345678': row }).lookup('0999999999')).toBeNull();
    expect(await new MockTaxLookupProvider({ '0312345678': row }, true).lookup('0999999999')).toEqual(row);
  });

  it('MemoryMailProvider giữ thư + last(to)', async () => {
    const m = new MemoryMailProvider();
    await m.send(msg);
    await m.send({ ...msg, subject: 'S2' });
    expect(m.last('a@b.vn')?.subject).toBe('S2');
  });
});

describe('MockBankFeedProvider (TIP-012)', () => {
  const conn = { id: 'c1', mode: 'sandbox' as const, config: { account_number: '0123' }, secrets: { api_key: 'sk_1' } };
  const p = new MockBankFeedProvider(sepayManifest);
  const body = JSON.stringify({ id: 'evt-1', transactions: [{ external_id: 't1', account_number: '0123', amount: '500000', direction: 'in', content: 'TT-000001', occurred_at: '2026-10-30T08:00:00Z' }] });

  it('test(): api_key "bad…" → lỗi, còn lại qua', async () => {
    await expect(p.test({ ...conn, secrets: { api_key: 'bad' } })).rejects.toThrow();
    await expect(p.test(conn)).resolves.toBeUndefined();
  });

  it('verifyWebhook: chữ ký HMAC đúng → event theo id; sai / body hỏng → null; parseTransactions', () => {
    const ev = p.verifyWebhook(conn, { headers: { 'x-mock-signature': mockSignature('sk_1', body) }, rawBody: body });
    expect(ev).toMatchObject({ id: 'evt-1', kind: 'transactions' });
    expect(p.parseTransactions(conn, ev!.payload)).toHaveLength(1);
    expect(p.verifyWebhook(conn, { headers: { 'x-mock-signature': mockSignature('khac', body) }, rawBody: body })).toBeNull();
    expect(p.verifyWebhook(conn, { headers: {}, rawBody: body })).toBeNull();
    const bad = '{x';
    expect(p.verifyWebhook(conn, { headers: { 'x-mock-signature': mockSignature('sk_1', bad) }, rawBody: bad })).toBeNull();
  });
});
