// TIP-012b AC1: chọn adapter theo chế độ tường minh — live = adapter thật SePay / Casso, sandbox = giả lập; không bao giờ lùi live → mock;
// chế độ ngoài manifest → null; adapter giả lập không chấp nhận chữ ký thật và ngược lại; manifest validate tài khoản / cách xác thực.
import { describe, expect, it } from 'vitest';
import { CassoBankFeed, MockBankFeedProvider, SepayBankFeed, adapterFor, connectorRegistry, defineConnectors, mockSignature, resolveMode, sepaySignature } from '../src';
import { mockMarketplaceManifest } from '../src/connectors/mock/order-sync';
import { sepayManifest } from '../src/connectors/sepay/manifest';
import { cassoManifest } from '../src/connectors/casso/manifest';
import type { ConnectionCtx } from '../src/types';

describe('chọn adapter bank_feed theo chế độ', () => {
  it('live → adapter thật; sandbox → giả lập; mỗi connector một instance riêng', () => {
    expect(adapterFor(connectorRegistry.get('sepay'), 'live')).toBeInstanceOf(SepayBankFeed);
    expect(adapterFor(connectorRegistry.get('casso'), 'live')).toBeInstanceOf(CassoBankFeed);
    expect(adapterFor(connectorRegistry.get('sepay'), 'sandbox')).toBeInstanceOf(MockBankFeedProvider);
    expect(adapterFor(connectorRegistry.get('casso'), 'sandbox')).toBeInstanceOf(MockBankFeedProvider);
  });

  it('không có adapter live → undefined (không lùi về sandbox); connector lạ → undefined', () => {
    const reg = defineConnectors([{ manifest: sepayManifest, adapters: { sandbox: new MockBankFeedProvider(sepayManifest) } }]);
    expect(adapterFor(reg.get('sepay'), 'live')).toBeUndefined();
    expect(adapterFor(connectorRegistry.get('mock_marketplace'), 'live')).toBeUndefined();
    // TIP-012c: brevo có adapter mail tenant live — không có sandbox (không lùi).
    expect(adapterFor(connectorRegistry.get('brevo'), 'sandbox')).toBeUndefined();
    expect(adapterFor(undefined, 'live')).toBeUndefined();
  });

  it('resolveMode: tường minh phải thuộc manifest; bỏ trống → live nếu có', () => {
    expect(resolveMode(sepayManifest)).toBe('live');
    expect(resolveMode(sepayManifest, 'sandbox')).toBe('sandbox');
    expect(resolveMode(mockMarketplaceManifest)).toBe('sandbox');
    expect(resolveMode(mockMarketplaceManifest, 'live')).toBeNull();
  });

  it('adapter live không nhận chữ ký giả lập; giả lập không nhận chữ ký SePay thật', () => {
    const conn: ConnectionCtx = { id: 'c', mode: 'live', config: {}, secrets: { api_key: 'k1', hmac_secret: 'k1' } };
    const body = JSON.stringify({ id: 'evt-1', transactions: [] });
    const live = adapterFor<SepayBankFeed>(connectorRegistry.get('sepay'), 'live')!;
    const sandbox = adapterFor<MockBankFeedProvider>(connectorRegistry.get('sepay'), 'sandbox')!;
    expect(live.verifyWebhook(conn, { headers: { 'x-mock-signature': mockSignature('k1', body) }, rawBody: body })).toBeNull();
    const ts = String(Math.floor(Date.now() / 1000));
    expect(sandbox.verifyWebhook(conn, { headers: { 'x-sepay-signature': sepaySignature('k1', ts, body), 'x-sepay-timestamp': ts }, rawBody: body })).toBeNull();
  });

  it('manifest: SePay cần API key HOẶC khoá HMAC; Casso tách khoá webhook khỏi API key, tài khoản nhận bắt buộc', () => {
    expect(sepayManifest.validate!({ config: { account_number: '1' }, secrets: {} })).toEqual({ api_key: 'required' });
    expect(sepayManifest.validate!({ config: { account_number: '1' }, secrets: { hmac_secret: 'x' } })).toBeNull();
    const req = (m: typeof cassoManifest) => m.auth.fields.filter((f) => !f.optional).map((f) => f.key);
    expect(req(cassoManifest)).toEqual(['webhook_secret', 'account_number']);
    expect(req(sepayManifest)).toEqual(['account_number']);
  });
});
