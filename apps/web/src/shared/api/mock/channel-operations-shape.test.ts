// TIP-014b A — mock thao tác kênh đúng shape API: Zalo → message.recall / message.react trả 202 job_accepted, tin hiện `provider_op`
// (chưa thu hồi) tới khi đọc trạng thái lệnh thấy confirmed; schema `channelOperationSchema` + `threadSchema`. Web chat vẫn áp ngay (200).
import { beforeEach, describe, expect, it } from 'vitest';
import { channelOperationSchema, threadSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createInboxState } from './domains/inbox';
import { resetChannelOperations } from './domains/channel-operations';

const thread = async (id: string) => threadSchema.parse(await mockTransport.get(`/conversations/${id}/messages`));
const opOf = async (url: string) => channelOperationSchema.parse(await mockTransport.get(url.replace(/^\/v1/, '')));

describe('mock thao tác kênh', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
    resetChannelOperations();
  });

  it('Zalo thu hồi: 202 → tin còn nội dung + provider_op pending → confirmed → recalled', async () => {
    const r = await mockTransport.action('message.recall', { conversation_id: 'c_lan', message_id: 'm7' }, { idempotencyKey: 'k1' });
    expect(r).toMatchObject({ status: 202, data: { status: 'job_accepted', status_url: expect.stringMatching(/^\/v1\/inbox\/channel-operations\//) } });
    let m = (await thread('c_lan')).data.find((x) => x.id === 'm7')!;
    expect(m).toMatchObject({ provider_op: { recall: 'pending' } });
    expect(m.recalled).toBeUndefined();
    const url = (r.data as { status_url: string }).status_url;
    expect((await opOf(url)).state).toBe('pending');
    expect(await opOf(url)).toMatchObject({ kind: 'recall', state: 'confirmed' });
    m = (await thread('c_lan')).data.find((x) => x.id === 'm7')!;
    expect(m).toMatchObject({ recalled: true });
    expect(m.provider_op).toBeUndefined();
  });

  it('Zalo cảm xúc: 202, menu hiện ý định ngay; bấm lại cùng emoji = gỡ', async () => {
    const r = await mockTransport.action('message.react', { conversation_id: 'c_lan', message_id: 'm7', emoji: '❤️' }, {});
    expect(r.status).toBe(202);
    expect((await thread('c_lan')).data.find((x) => x.id === 'm7')).toMatchObject({ reaction: '❤️', provider_op: { react: 'pending' } });
    await mockTransport.action('message.react', { conversation_id: 'c_lan', message_id: 'm7', emoji: '❤️' }, {});
    expect((await thread('c_lan')).data.find((x) => x.id === 'm7')!.reaction).toBeNull();
  });

  it('web chat: thu hồi áp ngay (200, không lệnh kênh)', async () => {
    const r = await mockTransport.action('message.recall', { conversation_id: 'c_hieu', message_id: 'h3' }, { idempotencyKey: 'k2' });
    expect(r.status).toBe(200);
    expect((await thread('c_hieu')).data.find((x) => x.id === 'h3')).toMatchObject({ recalled: true });
  });

  it('id lệnh lạ → 404', async () => {
    await expect(mockTransport.get('/inbox/channel-operations/0190f00e-0000-7000-8000-000000009999')).rejects.toMatchObject({ status: 404 });
  });
});
