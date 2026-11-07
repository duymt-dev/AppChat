// TIP-012b AC2 / AC10: hợp đồng SePay theo fixtures/sepay/contracts.json (tài liệu chính thức, chưa có provider thật). Hai cách xác thực:
// API Key và HMAC-SHA256 (`sha256=` trên `{ts}.{raw}`, lệch > 300 giây bị từ chối); ma trận payload sai → invalid_payload.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEPAY_MAX_SKEW_S, SepayBankFeed, sepaySignature } from '../src/connectors/sepay/adapter';
import { sepayManifest } from '../src/connectors/sepay/manifest';
import { ProviderError } from '../src/provider-errors';
import type { ConnectionCtx } from '../src/types';

const c = JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures/sepay/contracts.json'), 'utf8')) as {
  version: number;
  auth: { hmac: { max_skew_seconds: number } };
  cases: { name: string; body?: Record<string, unknown>; body_patch?: Record<string, unknown>; expect: { transactions?: unknown[]; direction?: string; amount?: string } }[];
  invalid: { name: string; patch: Record<string, unknown>; field: string }[];
};
const NOW = 1_793_000_000_000;
const a = new SepayBankFeed(sepayManifest, () => NOW);
const conn: ConnectionCtx = { id: 'c1', mode: 'live', config: { account_number: '0071000123456' }, secrets: { api_key: 'sk_test', hmac_secret: 'hs_test' } };
const base = c.cases.find((x) => x.name === 'official_payload_shape')!.body!;
const raw = JSON.stringify(base);
const ts = String(NOW / 1000);

describe('SePay webhook — hợp đồng', () => {
  it('fixture có phiên bản; ngưỡng lệch giờ khớp adapter', () => {
    expect(c.version).toBe(1);
    expect(c.auth.hmac.max_skew_seconds).toBe(SEPAY_MAX_SKEW_S);
  });

  it('payload mẫu → giao dịch chuẩn đúng hợp đồng; out giữ chiều', () => {
    expect(a.parseTransactions(conn, base)).toEqual(c.cases[0]!.expect.transactions);
    const out = c.cases.find((x) => x.name === 'outgoing')!;
    expect(a.parseTransactions(conn, { ...base, ...out.body_patch })[0]).toMatchObject({ direction: out.expect.direction, amount: out.expect.amount });
  });

  it('HMAC-SHA256: đúng chữ ký + giờ trong 300 giây → sự kiện; sai khoá / sửa body / lệch giờ / thiếu timestamp → null', () => {
    const h = (sig: string, t = ts, body = raw) => ({ headers: { 'x-sepay-signature': sig, 'x-sepay-timestamp': t }, rawBody: body });
    expect(a.verifyWebhook(conn, h(sepaySignature('hs_test', ts, raw)))).toMatchObject({ id: '92704', kind: 'transaction' });
    const edge = String(NOW / 1000 - SEPAY_MAX_SKEW_S);
    expect(a.verifyWebhook(conn, h(sepaySignature('hs_test', edge, raw), edge))).not.toBeNull();
    const late = String(NOW / 1000 - SEPAY_MAX_SKEW_S - 1);
    expect(a.verifyWebhook(conn, h(sepaySignature('hs_test', late, raw), late))).toBeNull();
    expect(a.verifyWebhook(conn, h(sepaySignature('khac', ts, raw)))).toBeNull();
    expect(a.verifyWebhook(conn, h(sepaySignature('hs_test', ts, raw), ts, raw.replace('1000000', '9000000')))).toBeNull();
    expect(a.verifyWebhook(conn, { headers: { 'x-sepay-signature': sepaySignature('hs_test', ts, raw) }, rawBody: raw })).toBeNull();
    // Có header chữ ký → không rơi về API Key (không hạ cấp xác thực).
    expect(a.verifyWebhook(conn, { headers: { 'x-sepay-signature': 'sha256=00', 'x-sepay-timestamp': ts, authorization: 'Apikey sk_test' }, rawBody: raw })).toBeNull();
    expect(a.verifyWebhook({ ...conn, secrets: { api_key: 'sk_test' } }, h(sepaySignature('', ts, raw)))).toBeNull();
  });

  it('API Key: chỉ cấu hình HMAC thì Apikey bị từ chối', () => {
    expect(a.verifyWebhook({ ...conn, secrets: { hmac_secret: 'hs_test' } }, { headers: { authorization: 'Apikey sk_test' }, rawBody: raw })).toBeNull();
  });

  it('ma trận payload sai → invalid_payload theo trường', () => {
    for (const bad of c.invalid) {
      let err: unknown;
      try {
        a.parseTransactions(conn, { ...base, ...bad.patch });
      } catch (e) {
        err = e;
      }
      expect(err, bad.name).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).field, bad.name).toBe(bad.field);
    }
  });
});
