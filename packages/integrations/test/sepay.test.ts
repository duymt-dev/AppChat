// TIP-010 AC8 / TIP-012b: adapter SePay — header `Authorization: Apikey <key>`, payload SePay → BankTransaction (chuẩn hoá chặt).
import { describe, expect, it } from 'vitest';
import { SepayBankFeed, sepayTime } from '../src/connectors/sepay/adapter';
import { ProviderError } from '../src/provider-errors';
import { sepayManifest } from '../src/connectors/sepay/manifest';
import type { ConnectionCtx } from '../src/types';

const conn: ConnectionCtx = { id: 'platform', mode: 'live', config: {}, secrets: { api_key: 'sk_sepay_123' } };
const body = {
  id: 92704,
  gateway: 'Vietcombank',
  transactionDate: '2026-10-30 14:02:37',
  accountNumber: '0071 000 888 999',
  code: null,
  content: 'MBVCB.123 APPCHAT INV20261001 CT',
  transferType: 'in',
  transferAmount: 1000000,
  referenceCode: 'FT26303',
};
const raw = JSON.stringify(body);
const a = new SepayBankFeed(sepayManifest);

describe('SePay bank feed', () => {
  it('Apikey đúng (không phân biệt hoa thường tiền tố) → sự kiện id SePay; sai / thiếu / body hỏng → null', () => {
    expect(a.verifyWebhook(conn, { headers: { authorization: 'Apikey sk_sepay_123' }, rawBody: raw })).toMatchObject({ id: '92704', kind: 'transaction' });
    expect(a.verifyWebhook(conn, { headers: { authorization: 'apikey sk_sepay_123' }, rawBody: raw })).not.toBeNull();
    expect(a.verifyWebhook(conn, { headers: { authorization: 'Apikey sai' }, rawBody: raw })).toBeNull();
    expect(a.verifyWebhook(conn, { headers: {}, rawBody: raw })).toBeNull();
    expect(a.verifyWebhook(conn, { headers: { authorization: 'Bearer sk_sepay_123' }, rawBody: raw })).toBeNull();
    expect(a.verifyWebhook(conn, { headers: { authorization: 'Apikey sk_sepay_123' }, rawBody: '{oops' })).toBeNull();
    expect(a.verifyWebhook({ ...conn, secrets: {} }, { headers: { authorization: 'Apikey ' }, rawBody: raw })).toBeNull();
  });

  it('payload → giao dịch chuẩn (STK bỏ khoảng trắng, tiền chuỗi nguyên, giờ VN → UTC, chiều out)', () => {
    expect(a.parseTransactions(conn, body)).toEqual([
      { external_id: '92704', account_number: '0071000888999', amount: '1000000', direction: 'in', content: 'MBVCB.123 APPCHAT INV20261001 CT', occurred_at: '2026-10-30T07:02:37.000Z' },
    ]);
    expect(a.parseTransactions(conn, { ...body, transferType: 'out', transferAmount: '250000' })[0]).toMatchObject({ direction: 'out', amount: '250000' });
    // TIP-012b: tiền / giờ sai → lỗi invalid_payload (cả request bị từ chối), không bỏ qua im lặng, không rơi về giờ máy chủ.
    expect(() => a.parseTransactions(conn, { ...body, transferAmount: 'abc' })).toThrow(ProviderError);
    expect(() => sepayTime('2026-01-01T00:00:00Z')).toThrow(ProviderError);
  });
});
