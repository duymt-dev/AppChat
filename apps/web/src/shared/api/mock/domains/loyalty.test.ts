import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loyaltyConfigSchema, loyaltyLookupSchema, loyaltyMemberFileSchema, loyaltyMemberSchema, loyaltyMembersPageSchema, loyaltyOverviewSchema } from '@appchat/shared';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createLoyaltyState } from './loyalty';

type Member = { contact_id: string; tier: string; points: number; earned: number };

describe('mock loyalty (COMMERCE §7)', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().loyalty = createLoyaltyState();
  });

  it('cấu hình mặc định đúng luật đã chốt', async () => {
    const c = await mockTransport.get<{ earn_vnd_per_point: number; redeem_vnd_per_point: number; max_redeem_pct: number; tiers: { min: number; mult: number }[] }>('/loyalty/config');
    expect(c).toMatchObject({ earn_vnd_per_point: 10000, redeem_vnd_per_point: 100, max_redeem_pct: 50 });
    expect(c.tiers.map((t) => [t.min, t.mult])).toEqual([[0, 1], [5000, 1], [15000, 1.5], [40000, 2]]);
  });

  it('cộng điểm tay → lên hạng theo điểm tích; hoàn tác trả về như cũ', async () => {
    const res = await mockTransport.action('loyalty.adjust_points', { contact_id: 'ct_ha', delta: 5200, reason: 'compensation' });
    expect(res.status === 200 && (res.data.result as { tier: string }).tier).toBe('gold');
    const id = res.status === 200 ? res.data.action_log_id : '';
    await mockTransport.undo(id);
    const m = await mockTransport.get<Member>('/loyalty/members/ct_ha');
    expect(m).toMatchObject({ tier: 'silver', points: 4200, earned: 9800 });
  });

  it('trừ quá số điểm hiện có → VALIDATION_FAILED; nhân viên CSKH không có quyền chỉnh cấu hình', async () => {
    await expect(mockTransport.action('loyalty.adjust_points', { contact_id: 'ct_ducanh', delta: -5000, reason: 'fraud' })).rejects.toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    });
    setMockRole('cs');
    await expect(mockTransport.action('loyalty.update_config', { marketplace_earn: true })).rejects.toMatchObject({ error: { code: 'FORBIDDEN' } });
  });

  it('tra cứu SĐT: thành viên có sẵn / khách CRM chưa vào chương trình', async () => {
    const a = await mockTransport.get<{ member: Member | null }>('/loyalty/lookup', { phone: '0903123456' });
    expect(a.member?.contact_id).toBe('ct_lan');
    const b = await mockTransport.get<{ member: Member | null }>('/loyalty/lookup', { phone: '0900 000 001' });
    expect(b.member).toBeNull();
  });

  it('mọi GET parse bằng zod chung với server (TIP-036 AC7)', async () => {
    expect(loyaltyConfigSchema.safeParse(await mockTransport.get('/loyalty/config')).success).toBe(true);
    const ov = loyaltyOverviewSchema.parse(await mockTransport.get('/loyalty/overview'));
    expect(ov.churn).toEqual([]);
    const page = loyaltyMembersPageSchema.parse(await mockTransport.get('/loyalty/members', { tier: 'all', page: 1, limit: 2 }));
    expect(page.meta).toMatchObject({ total: 5, page: 1, limit: 2 });
    expect(loyaltyMemberSchema.parse(await mockTransport.get('/loyalty/members/ct_lan'))).toMatchObject({ can_redeem: true });
    expect(loyaltyLookupSchema.safeParse(await mockTransport.get('/loyalty/lookup', { phone: '0903123456' })).success).toBe(true);
  });

  it('tệp theo thành viên: tải lên → loyalty.attach_file → có trong danh sách + mở được; hoàn tác gỡ; thành viên khác không thấy', async () => {
    const up = await mockTransport.upload(new File(['x'], 'Phiếu quà.pdf'), 'attachment');
    const res = await mockTransport.action('loyalty.attach_file', { contact_id: 'ct_ha', file_id: up.file_id });
    const files = z.array(loyaltyMemberFileSchema).parse(await mockTransport.get('/loyalty/members/ct_ha/files'));
    expect(files.map((f) => f.name)).toEqual(['Phiếu quà.pdf']);
    expect(await mockTransport.blob(`/loyalty/members/ct_ha/files/${up.file_id}`)).toBeInstanceOf(Blob);
    await expect(mockTransport.blob(`/loyalty/members/ct_lan/files/${up.file_id}`)).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
    await expect(mockTransport.action('loyalty.attach_file', { contact_id: 'ct_lan', file_id: up.file_id })).rejects.toMatchObject({ error: { code: 'CONFLICT' } });
    await mockTransport.undo(res.status === 200 ? res.data.action_log_id : '');
    expect(await mockTransport.get('/loyalty/members/ct_ha/files')).toEqual([]);
  });
});
