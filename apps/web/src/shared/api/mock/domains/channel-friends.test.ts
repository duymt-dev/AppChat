// TIP-014b E — mock bạn bè Zalo như server: nhận lời mời → 202 → lần đọc sau confirmed; gửi người lạ → 422; tra SĐT → found → gửi được.
import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createSettingsAppsState } from './settings-apps';
import { resetChannelFriends } from './channel-friends';

const ACC = 'acc_zalo_1';
type F = { state: string; op_status: string | null };

beforeEach(() => {
  setMockRole('owner');
  mockDb().settingsApps = createSettingsAppsState();
  resetChannelFriends();
});

describe('mock bạn bè Zalo', () => {
  it('lời mời tới → nhận → confirmed', async () => {
    const list = await mockTransport.get<{ external_id: string }[]>(`/settings/channels/${ACC}/friends`, { state: 'incoming' });
    expect(list.map((f) => f.external_id)).toEqual(['7400000001']);
    const r = await mockTransport.action('channel.friend.accept', { channel_account_id: ACC, external_id: '7400000001' });
    expect(r.status).toBe(202);
    expect((await mockTransport.get<F>(`/settings/channels/${ACC}/friends/7400000001`)).op_status).toBe('queued');
    expect(await mockTransport.get<F>(`/settings/channels/${ACC}/friends/7400000001`)).toMatchObject({ state: 'friend', op_status: 'confirmed' });
    expect(await mockTransport.get(`/settings/channels/${ACC}/friends`, { state: 'incoming' })).toEqual([]);
  });

  it('gửi người lạ → 422; tra SĐT found → gửi được', async () => {
    await expect(mockTransport.action('channel.friend.send', { channel_account_id: ACC, external_id: '7400000009', message: '' })).rejects.toMatchObject({ error: { fields: { external_id: 'unknown_identity' } } });
    const r = await mockTransport.action('channel.lookup_user', { channel_account_id: ACC, phone: '0912 345 678' });
    const id = r.status === 202 ? (r.data as { job_id: string }).job_id : '';
    await mockTransport.get(`/settings/channels/${ACC}/lookups/${id}`);
    expect(await mockTransport.get(`/settings/channels/${ACC}/lookups/${id}`)).toMatchObject({ state: 'found', external_id: '7400000009' });
    expect((await mockTransport.action('channel.friend.send', { channel_account_id: ACC, external_id: '7400000009', message: '' })).status).toBe(202);
  });
});
