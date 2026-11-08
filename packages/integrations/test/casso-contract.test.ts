// TIP-012b AC2 / AC10: hợp đồng Casso Webhook V2 theo fixtures/casso/contracts.json (tài liệu + mã mẫu chính thức, chưa có provider thật).
// Chữ ký mẫu chính thức (python.py) tái lập đúng; sai khoá / sửa body / thiếu header / webhook cũ → từ chối; id 0 = sự kiện thử (không
// giao dịch); amount âm = out; ma trận payload sai → invalid_payload (không ghi gì).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CassoBankFeed, cassoSignature } from '../src/connectors/casso/adapter';
import { cassoManifest } from '../src/connectors/casso/manifest';
import { ProviderError } from '../src/provider-errors';
import type { ConnectionCtx } from '../src/types';

type Body = { error: unknown; data: Record<string, unknown> };
const c = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/casso/contracts.json'), 'utf8')) as {
  version: number;
  cases: { name: string; secret?: string; signature?: string; body: Body; expect: { verified: boolean; event_id?: string; transactions?: unknown[]; ascii_and_raw?: boolean } }[];
  invalid: { name: string; data_patch?: Record<string, unknown>; body_patch?: Record<string, unknown>; field: string }[];
};
const a = new CassoBankFeed(cassoManifest);
const SECRET = 'casso_fixture_secret';
const conn = (secret = SECRET): ConnectionCtx => ({ id: 'c1', mode: 'live', config: { account_number: '0071000123456' }, secrets: { webhook_secret: secret } });
const req = (body: unknown, sig: string) => ({ headers: { 'x-casso-signature': sig }, rawBody: JSON.stringify(body) });
const T = '1730000000000';

describe('Casso Webhook V2 — hợp đồng', () => {
  it('fixture có phiên bản', () => expect(c.version).toBe(1));

  it('mẫu chính thức python.py: chữ ký Casso tái lập đúng → sự kiện thử id 0, không giao dịch', () => {
    const s = c.cases.find((x) => x.name === 'official_python_sample')!;
    const ev = a.verifyWebhook(conn(s.secret), req(s.body, s.signature!));
    expect(ev).toMatchObject({ id: '0', kind: 'transaction' });
    expect(a.parseTransactions(conn(s.secret), ev!.payload)).toEqual([]);
  });

  it('thứ tự key trong body không ảnh hưởng (Casso ký trên bản đã sắp)', () => {
    const s = c.cases.find((x) => x.name === 'official_python_sample')!;
    const shuffled = { data: Object.fromEntries(Object.entries(s.body.data).reverse()), error: 0 };
    expect(a.verifyWebhook(conn(s.secret), req(shuffled, s.signature!))).not.toBeNull();
  });

  it('ca fixture: ký bằng khoá test → giao dịch chuẩn đúng như hợp đồng (in / out theo dấu, giờ VN → UTC)', () => {
    for (const s of c.cases.filter((x) => x.expect.transactions && x.name !== 'official_python_sample')) {
      const ev = a.verifyWebhook(conn(), req(s.body, cassoSignature(SECRET, T, s.body)));
      expect(ev, s.name).not.toBeNull();
      expect(a.parseTransactions(conn(), ev!.payload), s.name).toEqual(s.expect.transactions);
    }
  });

  it('nội dung tiếng Việt: chấp nhận cả dạng ký JS (giữ nguyên) và Python (thoát ký tự)', () => {
    const s = c.cases.find((x) => x.expect.ascii_and_raw)!;
    expect(a.verifyWebhook(conn(), req(s.body, cassoSignature(SECRET, T, s.body)))).not.toBeNull();
    expect(a.verifyWebhook(conn(), req(s.body, cassoSignature(SECRET, T, s.body, true)))).not.toBeNull();
  });

  it('sai khoá / sửa body / thiếu hoặc hỏng header / không có khoá / webhook cũ secure-token → null', () => {
    const s = c.cases.find((x) => x.name === 'incoming_fixture')!;
    const sig = cassoSignature(SECRET, T, s.body);
    expect(a.verifyWebhook(conn('khac'), req(s.body, sig))).toBeNull();
    expect(a.verifyWebhook(conn(), req({ ...s.body, data: { ...s.body.data, amount: 99999999 } }, sig))).toBeNull();
    expect(a.verifyWebhook(conn(), req(s.body, sig.replace('t=' + T, 't=1')))).toBeNull();
    expect(a.verifyWebhook(conn(), { headers: {}, rawBody: JSON.stringify(s.body) })).toBeNull();
    expect(a.verifyWebhook(conn(), req(s.body, 'v1=abc'))).toBeNull();
    expect(a.verifyWebhook(conn(''), req(s.body, cassoSignature('', T, s.body)))).toBeNull();
    expect(a.verifyWebhook(conn(), { headers: { 'secure-token': SECRET }, rawBody: JSON.stringify(s.body) })).toBeNull();
    expect(a.verifyWebhook(conn(), { headers: { 'x-casso-signature': sig }, rawBody: '{oops' })).toBeNull();
  });

  it('ma trận payload sai (đã xác thực) → invalid_payload theo trường, không trả giao dịch', () => {
    const base = c.cases.find((x) => x.name === 'incoming_fixture')!.body;
    for (const bad of c.invalid) {
      const body = { ...base, ...(bad.body_patch ?? {}), data: { ...base.data, ...(bad.data_patch ?? {}) } };
      let err: unknown;
      try {
        a.parseTransactions(conn(), body);
      } catch (e) {
        err = e;
      }
      expect(err, bad.name).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).field, bad.name).toBe(bad.field);
    }
  });
});
