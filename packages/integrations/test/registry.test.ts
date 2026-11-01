// TIP-001 AC9: registry connector khớp prototype Nền tảng kết nối (trừ web_widget — DC-006), port hợp lệ,
// luật "kết nối được", tra theo port, chặn trùng key.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PORT_KEYS, connectorRegistry, defineConnectors, type PortKey } from '../src';
import { sepayManifest } from '../src/connectors/sepay/manifest';

const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../../fixtures/prototype-parity/settings.json'), 'utf8'),
) as { connectors: { key: string; status: string }[] };

const RELEASE = ['brevo', 'smtp', 'sepay', 'casso'];

describe('connectorRegistry', () => {
  it('17 key = fixture trừ web_widget, không trùng', () => {
    const keys = connectorRegistry.listed().map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
    const expected = fixture.connectors.map((c) => c.key).filter((k) => k !== 'web_widget');
    expect([...keys].sort()).toEqual(expected.sort());
  });

  it('trạng thái ga / coming_soon khớp fixture', () => {
    const st = new Map(fixture.connectors.map((c) => [c.key, c.status]));
    for (const m of connectorRegistry.listed()) {
      expect(m.status).toBe(st.get(m.key));
      expect(m.status).toBe(RELEASE.includes(m.key) ? 'ga' : 'coming_soon');
    }
  });

  it('port thuộc danh sách port của standard; tra theo port', () => {
    for (const m of connectorRegistry.listed()) expect(PORT_KEYS).toContain(m.port);
    const keysOf = (p: PortKey) => connectorRegistry.byPort(p).map((e) => e.manifest.key);
    expect(keysOf('bank_feed').sort()).toEqual(['casso', 'sepay']);
    expect(keysOf('einvoice')).toHaveLength(4);
    expect(keysOf('mail').sort()).toEqual(['brevo', 'mailgun', 'smtp']);
  });

  it('kết nối được ⇔ không "Sắp có" (DC-042); bank_feed có adapter mock (sandbox)', () => {
    for (const m of connectorRegistry.listed()) expect(connectorRegistry.isConnectable(m.key)).toBe(RELEASE.includes(m.key));
    expect(connectorRegistry.isConnectable('nope')).toBe(false);
    expect(connectorRegistry.get('sepay')?.adapter).toBeDefined();
    expect(connectorRegistry.get('casso')?.adapter).toBeDefined();
  });

  it('trường form + màu khớp fixture (thẻ FE đọc từ manifest)', () => {
    const fx = fixture.connectors as unknown as { key: string; color: string; fields: string[]; name: string }[];
    for (const m of connectorRegistry.listed()) {
      const f = fx.find((c) => c.key === m.key)!;
      expect({ key: m.key, color: m.color, name: m.name, fields: m.auth.fields.map((x) => x.key) }).toEqual({ key: f.key, color: f.color, name: f.name, fields: f.fields });
    }
    expect(connectorRegistry.get('sepay')!.manifest.auth.fields.filter((f) => f.secret).map((f) => f.key)).toEqual(['api_key']);
  });

  it('trùng key / port lạ / adapter lệch → lỗi lúc define', () => {
    expect(() => defineConnectors([{ manifest: sepayManifest }, { manifest: sepayManifest }])).toThrow(/trùng/);
    const bad = { ...sepayManifest, key: 'bad', port: 'fax' as PortKey };
    expect(() => defineConnectors([{ manifest: bad }])).toThrow(/Port/);
    const other = { ...sepayManifest, key: 'other' };
    expect(() => defineConnectors([{ manifest: sepayManifest, adapter: { manifest: other } }])).toThrow(/không khớp/);
  });
});
