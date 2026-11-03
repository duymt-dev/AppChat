// TIP-023c G3 (DEF-012-1): metadata form connector theo manifest (+ phép chiếu zod được hỗ trợ) và thăm dò `adapter.test` — hết hạn
// 10 giây → failed timeout, lỗi provider không lộ thông điệp, "Sắp có" / không adapter → unsupported (không bao giờ ok).
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { connectorRegistry, type ConnectorEntry } from '@appchat/integrations';
import { connectorEntry, formFields, probe } from '../src/integrations/services/form-schema';

const conn = { id: 'draft', mode: 'sandbox' as const, config: {}, secrets: {} };
const entry = (test?: () => Promise<void>, schema?: z.ZodObject): ConnectorEntry =>
  ({
    manifest: {
      key: 'x',
      port: 'mail',
      name: 'X',
      logo: 'x',
      color: '#000',
      group: 'marketing',
      status: 'ga',
      auth: { kind: 'basic', fields: [{ key: 'host' }, { key: 'email', optional: true }, { key: 'port' }, { key: 'pass', secret: true }, { key: 'odd' }], schema },
      modes: ['live'],
    },
    adapter: test ? { test } : undefined,
  }) as unknown as ConnectorEntry;

describe('formFields', () => {
  it('lấy bí mật / tuỳ chọn từ manifest; zod string-url / email / max / number, hình lạ → string', () => {
    const schema = z.object({ host: z.string().url().max(200), email: z.string().email().optional(), port: z.number(), pass: z.string(), odd: z.array(z.string()) });
    expect(formFields(entry(undefined, schema))).toEqual([
      { key: 'host', secret: false, optional: false, type: 'url', max: 200 },
      { key: 'email', secret: false, optional: true, type: 'email' },
      { key: 'port', secret: false, optional: false, type: 'number' },
      { key: 'pass', secret: true, optional: false, type: 'string' },
      { key: 'odd', secret: false, optional: false, type: 'string' },
    ]);
  });

  it('registry thật: sepay có api_key bí mật; provider lạ → 404', () => {
    expect(formFields(connectorEntry(connectorRegistry, 'sepay')).find((f) => f.key === 'api_key')).toMatchObject({ secret: true });
    expect(() => connectorEntry(connectorRegistry, 'nope')).toThrow();
  });
});

describe('probe', () => {
  it('ok / lỗi làm sạch / hết hạn / không adapter / Sắp có', async () => {
    expect(await probe(entry(async () => undefined), conn)).toEqual({ status: 'ok' });
    const leak = await probe(entry(async () => Promise.reject(new Error('token=SECRET'))), conn);
    expect(leak).toEqual({ status: 'failed', reason: 'rejected' });
    expect(await probe(entry(() => new Promise(() => undefined)), conn, 20)).toEqual({ status: 'failed', reason: 'timeout' });
    expect(await probe(entry(), conn)).toEqual({ status: 'unsupported', reason: 'no_test' });
    expect(await probe(connectorEntry(connectorRegistry, 'kiotviet'), conn)).toEqual({ status: 'unsupported', reason: 'coming_soon' });
  });
});
