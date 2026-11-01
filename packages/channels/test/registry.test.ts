// TIP-001 AC9: registry kênh khớp danh sách kênh của prototype (fixture settings.json), 3 kênh phát hành đủ manifest,
// luật "kết nối được" và chặn trùng type.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FakeZaloTransport, buildChannelRegistry, channelRegistry, defineChannels, type ChannelAdapter } from '../src';
import { webchatManifest } from '../src/webchat/manifest';

const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, '../../../fixtures/prototype-parity/settings.json'), 'utf8'),
) as { channels: { type: string }[] };

const RELEASE = ['zalo_personal', 'webchat', 'email'];

describe('channelRegistry', () => {
  it('đủ 16 type của prototype, không trùng, đúng thứ tự + hiển thị của trang Kênh', () => {
    const types = channelRegistry.manifests().map((m) => m.type);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(fixture.channels.map((c) => c.type));
    for (const [i, m] of channelRegistry.manifests().entries()) {
      const f = fixture.channels[i] as unknown as Record<string, string>;
      expect(m.display).toMatchObject({ name: f.name, short: f.short, color: f.color, group: f.group, label: f.label });
    }
  });

  it('3 kênh phát hành là ga, còn lại coming_soon', () => {
    for (const m of channelRegistry.manifests()) {
      expect(m.status).toBe(RELEASE.includes(m.type) ? 'ga' : 'coming_soon');
    }
  });

  it.each(RELEASE)('%s: manifest đủ trường bắt buộc', (type) => {
    const m = channelRegistry.get(type)!.manifest;
    expect(m.label).toBe(`channels.${type}.label`);
    expect(m.icon.length).toBeGreaterThan(0);
    expect(m.capabilities.send).toContain('text');
    expect(m.capabilities.maxTextLength).toBeGreaterThan(0);
    expect(m.rateLimit.perMinute).toBeGreaterThan(0);
    expect(['lease', 'webhook', 'poll']).toContain(m.session);
  });

  it('kết nối được theo manifest (DC-068): 3 kênh phát hành; type lạ → false; bản chỉ manifest không có adapter', () => {
    for (const m of channelRegistry.manifests()) expect(channelRegistry.isConnectable(m.type)).toBe(RELEASE.includes(m.type));
    expect(channelRegistry.isConnectable('nope')).toBe(false);
    expect(channelRegistry.hasAdapter('zalo_personal')).toBe(false);
  });

  it('buildChannelRegistry({ zalo }) gắn adapter Zalo cá nhân', () => {
    const reg = buildChannelRegistry({ zalo: new FakeZaloTransport() });
    expect(reg.hasAdapter('zalo_personal')).toBe(true);
    expect(reg.get('zalo_personal')!.adapter!.manifest.type).toBe('zalo_personal');
    expect(reg.hasAdapter('email')).toBe(false);
  });

  it('kênh ga → kết nối được; coming_soon có adapter vẫn không', () => {
    const adapter = (manifest = webchatManifest): ChannelAdapter => ({
      manifest,
      send: async () => ({ externalMsgId: 'x' }),
      probe: async () => 'connected',
    });
    const soon = { ...webchatManifest, type: 'soon', status: 'coming_soon' as const };
    const reg = defineChannels([
      { manifest: webchatManifest, adapter: adapter() },
      { manifest: soon, adapter: adapter(soon) },
    ]);
    expect(reg.isConnectable('webchat')).toBe(true);
    expect(reg.isConnectable('soon')).toBe(false);
  });

  it('trùng type hoặc adapter lệch manifest → lỗi lúc define', () => {
    expect(() => defineChannels([{ manifest: webchatManifest }, { manifest: webchatManifest }])).toThrow(/trùng/);
    const other = { ...webchatManifest, type: 'other' };
    expect(() =>
      defineChannels([
        {
          manifest: webchatManifest,
          adapter: { manifest: other, send: async () => ({ externalMsgId: '' }), probe: async () => 'error' },
        },
      ]),
    ).toThrow(/không khớp/);
  });
});
