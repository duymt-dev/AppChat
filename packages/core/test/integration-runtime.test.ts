// TIP-012b P3 §1.3 / §1.4 / §4.4 (đơn vị, không DB): sức khoẻ từ bằng chứng (đã lưu khoá ≠ xác minh; thăm dò khoá cũ không tính),
// khả năng theo adapter đúng chế độ, lịch lùi tôn trọng Retry-After, cursor log hỏng → 422, cầu HTTP chỉ host cố định + https và
// không mang URL / body provider vào lỗi.
import { describe, expect, it } from 'vitest';
import { connectorRegistry, isProviderError } from '@appchat/integrations';
import { backoffAt, isTerminal } from '../src/integrations/operations/call-receipt';
import { capabilitiesOf, healthOf, maskAccount } from '../src/integrations/services/connection-health';
import { decodeCursor, encodeCursor } from '../src/integrations/services/connection-detail';
import { providerHttp } from '../src/integrations/operations/provider-http';
import { probe } from '../src/integrations/services/form-schema';

const base = { mode: 'live' as const, status: 'connected' as const, credentialRev: 2, probedRev: 2, lastProbeStatus: 'verified', lastError: null };

describe('sức khoẻ kết nối', () => {
  it('verified chỉ khi thăm dò khoá HIỆN TẠI thành công; khoá cũ / chưa thăm dò → chưa xác minh; lỗi → degraded; sandbox riêng', () => {
    expect(healthOf(base)).toBe('verified');
    expect(healthOf({ ...base, probedRev: 1 })).toBe('configured_unverified');
    expect(healthOf({ ...base, probedRev: null, lastProbeStatus: null }, true)).toBe('probing');
    expect(healthOf({ ...base, lastProbeStatus: 'unsupported' })).toBe('configured_unverified');
    expect(healthOf({ ...base, lastProbeStatus: 'failed' })).toBe('degraded');
    expect(healthOf({ ...base, lastError: 'rate_limited' })).toBe('degraded');
    expect(healthOf({ ...base, mode: 'sandbox' })).toBe('sandbox');
    expect(healthOf({ ...base, status: 'disconnected' })).toBe('disconnected');
  });

  it('khả năng theo adapter đúng chế độ: Casso live kéo được, SePay live không kéo; connector không adapter → tất cả false', () => {
    expect(capabilitiesOf(connectorRegistry.get('casso'), 'live')).toEqual({ webhook: true, probe: true, pull: true });
    expect(capabilitiesOf(connectorRegistry.get('sepay'), 'live')).toEqual({ webhook: true, probe: true, pull: false });
    expect(capabilitiesOf(connectorRegistry.get('brevo'), 'live')).toEqual({ webhook: false, probe: false, pull: false });
    expect(maskAccount('0071000123456')).toBe('••3456');
  });
});

describe('biên nhận lệnh', () => {
  it('lịch lùi tăng theo lượt, trần 10 phút, Retry-After lớn hơn thì theo provider', () => {
    const now = new Date('2026-11-08T00:00:00Z');
    expect(backoffAt(now, 1).getTime() - now.getTime()).toBe(5_000);
    expect(backoffAt(now, 3).getTime() - now.getTime()).toBe(20_000);
    expect(backoffAt(now, 20).getTime() - now.getTime()).toBe(600_000);
    expect(backoffAt(now, 1, 120).getTime() - now.getTime()).toBe(120_000);
    expect(['succeeded', 'failed', 'unknown', 'cancelled'].every(isTerminal)).toBe(true);
    expect(isTerminal('queued') || isTerminal('running')).toBe(false);
  });

  it('cursor log: khứ hồi; hỏng → 422', () => {
    const c = encodeCursor(new Date('2026-11-08T01:02:03.000Z'), '0196f012-0000-7000-8000-00000000c501');
    expect(decodeCursor(c)).toEqual({ t: '2026-11-08T01:02:03.000Z', id: '0196f012-0000-7000-8000-00000000c501' });
    expect(() => decodeCursor('xx')).toThrow();
    expect(decodeCursor(undefined)).toBeNull();
  });
});

describe('cầu HTTP provider', () => {
  it('chỉ https + host cố định; host lạ / http → unsupported trước khi gọi', async () => {
    let called = 0;
    const http = providerHttp({ transport: async () => (called++, { status: 200, headers: {}, body: '{}' }) });
    for (const u of ['https://evil.example/x', 'http://oauth.casso.vn/v2/userInfo', 'https://oauth.casso.vn.evil.io/', 'not a url']) {
      const e = await http(u, {}).catch((x: unknown) => x);
      expect(isProviderError(e) && e.code).toBe('unsupported');
    }
    expect(called).toBe(0);
    await http('https://oauth.casso.vn/v2/userInfo', {});
    expect(called).toBe(1);
  });
});

describe('thăm dò nháp ngân hàng (P5 §4.1 A)', () => {
  it('Casso nháp: integration.test dùng thăm dò đọc thật qua cầu HTTP (host cố định) — tìm thấy tài khoản → ok, không thấy → failed; thiếu khoá đọc → unsupported', async () => {
    const urls: string[] = [];
    const body = JSON.stringify({ error: 0, data: { bankAccs: [{ bankSubAccId: '8007041027107' }] } });
    const http = providerHttp({ transport: async (u) => (urls.push(u), { status: 200, headers: {}, body }) });
    const e = connectorRegistry.get('casso')!;
    const conn = (acc: string, secrets: Record<string, string>) => ({ id: 'draft', mode: 'live' as const, config: { account_number: acc }, secrets });
    expect(await probe(e, conn('8007041027107', { webhook_secret: 'w', api_key: 'k' }), 1000, http)).toEqual({ status: 'ok' });
    expect(urls.every((u) => u.startsWith('https://oauth.casso.vn/'))).toBe(true);
    expect(await probe(e, conn('0000000000', { webhook_secret: 'w', api_key: 'k' }), 1000, http)).toEqual({ status: 'failed', reason: 'rejected' });
    expect(await probe(e, conn('8007041027107', { webhook_secret: 'w' }), 1000, http)).toEqual({ status: 'unsupported', reason: 'no_test' });
  });
});

