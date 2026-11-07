// TIP-038 pha 2: mock Tổng quan đúng `dashboardSchema` dùng chung với API thật; việc follow có id UUID (không còn F1…); hoàn tất idempotent
// (bấm lại không trừ hai lần), id lạ → 404, hoàn tác trả lại; Credit chỉ Owner (vai trò khác `credit: null`).
import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createDashboardState, dashboardHandlers } from './domains/dashboard';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const complete = dashboardHandlers['follow_up.complete']!;

describe('mock Tổng quan — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().dashboard = createDashboardState();
    setMockRole('owner');
  });

  it('GET /dashboard khớp schema; ≤ 5 việc follow + tổng; id dạng UUID', async () => {
    const d = (await mockTransport.get('/dashboard')) as { follow_ups: { id: string }[]; follow_up_count: number };
    expect(issues(dashboardSchema.safeParse(d))).toEqual([]);
    expect(d.follow_ups).toHaveLength(5);
    expect(d.follow_up_count).toBe(8);
    expect(d.follow_ups[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('follow_up.complete idempotent, id lạ 404, hoàn tác trả lại', async () => {
    const d = (await mockTransport.get('/dashboard')) as { follow_ups: { id: string }[] };
    const id = d.follow_ups[0]!.id;
    expect(complete.execute(mockDb(), { follow_up_id: id } as never)).toEqual({ remaining: 7 });
    expect(complete.execute(mockDb(), { follow_up_id: id } as never)).toEqual({ remaining: 7 });
    expect(() => complete.execute(mockDb(), { follow_up_id: 'F1' } as never)).toThrow();
    complete.undo!(mockDb(), { follow_up_id: id } as never);
    expect(((await mockTransport.get('/dashboard')) as { follow_up_count: number }).follow_up_count).toBe(8);
  });

  it('Credit chỉ Owner', async () => {
    setMockRole('sales');
    const d = (await mockTransport.get('/dashboard')) as { credit: unknown; ai_today: { credits: unknown } };
    expect(d.credit).toBeNull();
    expect(d.ai_today.credits).toBeNull();
  });
});
