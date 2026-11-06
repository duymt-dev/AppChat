// TIP-022b AC7 — cảnh báo gán từ cấu hình THẬT của tài khoản (không từ danh sách loại kênh); phiên bản gán đổi khi người khác đổi gán /
// phân luồng → xác nhận cũ 409; ứng viên phân luồng phải là agent đã xuất bản, đúng loại kênh, không trùng.
import { describe, expect, it } from 'vitest';
import { channelBindingPreview } from '../src/ai/agents/channel-binding-preview';
import { assertBindingVersion, assertRouting } from '../src/ai/agents/channel-agent-config';
import { bindingVersion } from '../src/channels/services/binding-version';

const AG1 = '00000000-0000-7000-8000-000000000001';
const AG2 = '00000000-0000-7000-8000-000000000002';

describe('xem trước gán tài khoản', () => {
  it('đọc agent đang gán thật + tên; tài khoản chưa gán → rỗng', async () => {
    const db = {
      channelAccount: { findMany: async ({ where }: { where: { type?: { in: string[] } } }) => (expect(where.type).toEqual({ in: ['zalo_personal'] }), [{ id: 'a1', name: 'Zalo Shop', type: 'zalo_personal', settings: { agent_id: AG1 } }, { id: 'a2', name: 'Zalo 2', type: 'zalo_personal', settings: {} }]) },
      aiAgent: { findMany: async () => [{ id: AG1, name: 'Sales Bot' }] },
    };
    const p = await channelBindingPreview(db as never, ['zalo_personal']);
    expect(p.accounts.map((a) => [a.name, a.current_agent_id, a.current_agent])).toEqual([['Zalo Shop', AG1, 'Sales Bot'], ['Zalo 2', null, '']]);
    expect(p.accounts[0]!.version).toBe(bindingVersion({ agent_id: AG1 }));
  });

  it('đổi gán / phân luồng đồng thời → phiên bản khác → 409', () => {
    const v = bindingVersion({ agent_id: AG1, greeting: 'x' });
    expect(bindingVersion({ agent_id: AG1, greeting: 'khác' })).toBe(v); // trường khác không ảnh hưởng
    expect(() => assertBindingVersion({ agent_id: AG2 }, v)).toThrow();
    expect(() => assertBindingVersion({ agent_id: AG1, routing: { enabled: true, candidates: [] } }, v)).toThrow();
    expect(() => assertBindingVersion({ agent_id: AG1 }, v)).not.toThrow();
    expect(() => assertBindingVersion({ agent_id: AG2 }, undefined)).not.toThrow();
  });

  it('ứng viên phân luồng: đã xuất bản, đúng loại kênh, không trùng; bật cần ≥ 1', async () => {
    const tx = { aiAgent: { findMany: async () => [{ id: AG1, publishedVersion: 2, channels: [] }, { id: AG2, publishedVersion: 0, channels: [] }] } };
    const cand = (id: string) => ({ agent_id: id, priority: 1, keywords: [' giá ', 'giá'] });
    expect(await assertRouting(tx as never, { enabled: true, candidates: [cand(AG1)] }, 'webchat')).toEqual({ enabled: true, candidates: [{ agent_id: AG1, priority: 1, keywords: ['giá'] }] });
    await expect(assertRouting(tx as never, { enabled: true, candidates: [cand(AG2)] }, 'webchat')).rejects.toThrow();
    await expect(assertRouting(tx as never, { enabled: true, candidates: [cand(AG1), cand(AG1)] }, 'webchat')).rejects.toThrow();
    await expect(assertRouting(tx as never, { enabled: true, candidates: [] }, 'webchat')).rejects.toThrow();
    const typed = { aiAgent: { findMany: async () => [{ id: AG1, publishedVersion: 1, channels: ['email'] }] } };
    await expect(assertRouting(typed as never, { enabled: false, candidates: [cand(AG1)] }, 'webchat')).rejects.toThrow();
  });
});
