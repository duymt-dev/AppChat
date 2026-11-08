// TIP-012b P3 §1.4 / §4.3: client đọc Casso / SePay theo `read` của fixtures/{casso,sepay}/contracts.json (tài liệu chính thức — chưa
// nghiệm thu provider thật). URL cố định + header đúng; trang / con trỏ có giới hạn; lỗi → mã ổn định không mang body provider;
// không khoá đọc → unsupported; SePay không khai kéo (định danh kéo ≠ webhook).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CassoBankFeed, SepayBankFeed, cassoManifest, isProviderError, sepayManifest, type ProviderHttp } from '../src';
import type { ConnectionCtx } from '../src/types';

type Case = { name: string; status: number; body: unknown; expect?: { has_more?: boolean; cursor?: unknown; transactions?: unknown[] } };
const read = (p: string) => (JSON.parse(readFileSync(join(import.meta.dirname, `fixtures/${p}/contracts.json`), 'utf8')) as { read: { version: number; cases: Case[] } }).read;
const casso = read('casso');
const sepay = read('sepay');
const cs = (n: string) => casso.cases.find((c) => c.name === n)!;

/** HTTP giả: ghi lại URL / header, trả phản hồi cho sẵn. */
function fake(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const http: ProviderHttp = async (url, h) => {
    calls.push({ url, headers: h });
    return { status, headers, body: typeof body === 'string' ? body : JSON.stringify(body) };
  };
  return { http, calls };
}
const conn = (secrets: Record<string, string>, account = '8007041027107'): ConnectionCtx => ({ id: 'c1', mode: 'live', config: { account_number: account }, secrets });
const SINCE = new Date('2021-04-09T17:00:00.000Z'); // 2021-04-10 00:00 giờ VN
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: unknown) => (isProviderError(e) ? e.code : 'raw'));

describe('Casso API v2 — đọc', () => {
  const a = new CassoBankFeed(cassoManifest);

  it('fixture có phiên bản', () => expect(casso.version).toBe(1));

  it('kéo trang đầu: URL cố định, Apikey, ASC; chuẩn hoá chặt; còn trang → con trỏ trang kế', async () => {
    const f = fake(200, cs('page_official_shape').body);
    const page = await a.pull(conn({ webhook_secret: 'w', api_key: 'K1' }), f.http, null, SINCE);
    expect(f.calls[0]!.url).toBe('https://oauth.casso.vn/v2/transactions?fromDate=2021-04-10&page=1&pageSize=100&sort=ASC');
    expect(f.calls[0]!.headers.authorization).toBe('Apikey K1');
    expect(page.transactions).toEqual(cs('page_official_shape').expect!.transactions);
    expect(page).toMatchObject({ has_more: true, cursor: cs('page_official_shape').expect!.cursor });
  });

  it('trang cuối → hết; lần sau quét lại từ ngày giao dịch cuối − 1 (trang 1), không tăng trang vô hạn', async () => {
    const f = fake(200, cs('last_page').body);
    const page = await a.pull(conn({ api_key: 'K1' }), f.http, { from: '2021-04-10', page: 2 }, SINCE);
    expect(f.calls[0]!.url).toContain('fromDate=2021-04-10&page=2');
    expect(page).toMatchObject({ has_more: false, cursor: cs('last_page').expect!.cursor });
  });

  it('con trỏ hỏng / lạ → dùng mốc kích hoạt, trang 1 (không nhận chuỗi tuỳ ý vào URL)', async () => {
    const f = fake(200, cs('last_page').body);
    await a.pull(conn({ api_key: 'K1' }), f.http, { from: '../../x', page: -3 }, SINCE);
    expect(f.calls[0]!.url).toContain('fromDate=2021-04-10&page=1&');
  });

  it('một bản ghi sai (tiền lẻ / thiếu tài khoản / giờ lạ) → cả trang invalid_payload', async () => {
    const base = cs('last_page').body as { data: { records: Record<string, unknown>[] } };
    for (const patch of [{ amount: 1.5 }, { bankSubAccId: '' }, { when: '20/04/2021' }, { amount: '1e5' }]) {
      const body = structuredClone(base);
      Object.assign(body.data.records[0]!, patch);
      expect(await code(a.pull(conn({ api_key: 'K1' }), fake(200, body).http, null, SINCE))).toBe('invalid_payload');
    }
  });

  it('thăm dò userInfo: tài khoản nhận có / không thuộc khoá; chỉ trả số đếm', async () => {
    const body = cs('userinfo_official_shape').body;
    expect(await a.probe(conn({ api_key: 'K1' }, '8007041023848'), fake(200, body).http)).toEqual({ account_found: true, accounts: 2 });
    expect(await a.probe(conn({ api_key: 'K1' }, '999'), fake(200, body).http)).toEqual({ account_found: false, accounts: 2 });
  });

  it('lỗi provider → mã ổn định, không mang body; không có api_key → unsupported (không gọi mạng)', async () => {
    const c = conn({ api_key: 'K1' });
    expect(await code(a.probe(c, fake(401, '<html>secret K1</html>').http))).toBe('auth_failed');
    expect(await code(a.probe(c, fake(200, { error: 401, message: 'Unauthorized Access', data: null }).http))).toBe('auth_failed');
    expect(await code(a.probe(c, fake(500, 'boom').http))).toBe('provider_unavailable');
    expect(await code(a.probe(c, fake(200, 'not json').http))).toBe('invalid_payload');
    const rl = await a.probe(c, fake(429, '', { 'retry-after': '30' }).http).catch((e: unknown) => e);
    expect(rl).toMatchObject({ code: 'rate_limited', retryAfterS: 30 });
    expect(String((rl as Error).message)).not.toContain('K1');
    const none = fake(200, {});
    expect(await code(a.probe(conn({ webhook_secret: 'w' }), none.http))).toBe('unsupported');
    expect(none.calls).toHaveLength(0);
  });
});

describe('SePay API v2 — đọc', () => {
  const a = new SepayBankFeed(sepayManifest);
  const body = sepay.cases.find((c) => c.name === 'bank_accounts_official_shape')!.body;

  it('thăm dò bank-accounts: Bearer api_token, host cố định; khoá webhook không dùng làm token đọc', async () => {
    const f = fake(200, body);
    expect(await a.probe(conn({ api_key: 'WH', api_token: 'T1' }, '0071000123456'), f.http)).toEqual({ account_found: true, accounts: 1 });
    expect(f.calls[0]!.url).toBe('https://userapi.sepay.vn/v2/bank-accounts?q=0071000123456&per_page=20');
    expect(f.calls[0]!.headers.authorization).toBe('Bearer T1');
    const none = fake(200, body);
    expect(await code(a.probe(conn({ api_key: 'WH' }), none.http))).toBe('unsupported');
    expect(none.calls).toHaveLength(0);
  });

  it('lỗi → mã ổn định; không khai kéo (mã giao dịch API ≠ mã webhook)', async () => {
    expect(await code(a.probe(conn({ api_token: 'T' }), fake(403, 'x').http))).toBe('auth_failed');
    expect(await code(a.probe(conn({ api_token: 'T' }), fake(429, '', { 'x-sepay-userapi-retry-after': '2' }).http))).toBe('rate_limited');
    expect(await code(a.probe(conn({ api_token: 'T' }), fake(200, { status: 'success', data: {} }).http))).toBe('invalid_payload');
    expect((a as { pull?: unknown }).pull).toBeUndefined();
  });
});
