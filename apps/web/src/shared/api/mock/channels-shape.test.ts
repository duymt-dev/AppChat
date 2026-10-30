// TIP-014: route mock Kênh kết nối đúng shape đọc dùng chung với API thật (packages/shared/src/api/channels.ts) +
// luồng QR mock: start_login → `/login` waiting (QR) → connected.
import { beforeEach, describe, expect, it } from 'vitest';
import { channelAccountStatsSchema, channelLoginStateSchema, settingsChannelListSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const ok = (r: { success: boolean; error?: { issues: unknown[] } }) => expect(r.success ? [] : r.error!.issues).toEqual([]);

describe('mock channels — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /settings/channels + /stats', async () => {
    const list = await mockTransport.get('/settings/channels', { filter: 'all' });
    ok(settingsChannelListSchema.safeParse(list));
    ok(channelAccountStatsSchema.safeParse(await mockTransport.get('/settings/channels/acc_zalo_1/stats', { days: 7 })));
  });

  it('channel.zalo.start_login → /login waiting (QR) → connected', async () => {
    const r = await mockTransport.action<{ channel_account_id: string }>('channel.zalo.start_login', { label: 'Zalo mới' });
    const id = (r.data as { result: { channel_account_id: string } }).result.channel_account_id;
    const s1 = channelLoginStateSchema.parse(await mockTransport.get(`/settings/channels/${id}/login`));
    expect(s1).toMatchObject({ status: 'waiting', qr: expect.any(String) });
    expect(channelLoginStateSchema.parse(await mockTransport.get(`/settings/channels/${id}/login`)).status).toBe('connected');
    const zalo = settingsChannelListSchema.parse(await mockTransport.get('/settings/channels', { filter: 'all' })).find((c) => c.type === 'zalo_personal')!;
    expect(zalo.accounts.find((a) => a.id === id)).toMatchObject({ name: 'Zalo mới', connected: true });
  });
});
