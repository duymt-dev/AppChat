// Mock Tổng quan: GET /dashboard + onboarding.toggle_step + follow_up.complete — cùng `dashboardSchema` với API thật (TIP-038 pha 2). Dữ liệu
// hiển thị = prototype L1079–1177, L9201–9233; việc follow có id UUID + version + route như bảng `follow_up` (không còn id mẫu F1…).
// Việc follow ở Lịch hẹn (`cfu_*` fixture lịch) dùng chung action.
import { ApiRequestError, type DashboardDto } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/dashboard.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

export type DashboardFixture = typeof fixture;
export type OnboardingStepKey = 'channel' | 'ai' | 'team' | 'template' | 'sla';

export interface DashboardState {
  data: DashboardFixture;
  stepsDone: Partial<Record<OnboardingStepKey, boolean>>;
  removedFollowUps: string[];
}

/** id mock dạng UUID cố định theo thứ tự fixture (F1 → …0f01). */
export const followUpId = (i: number) => `0190f000-0000-7000-8000-00000000${(3840 + i + 1).toString(16).padStart(4, '0')}`;
const contactId = (i: number) => `0190f000-0000-7000-8000-00000000${(3584 + i + 1).toString(16).padStart(4, '0')}`;

export const createDashboardState = (): DashboardState => ({ data: structuredClone(fixture), stepsDone: {}, removedFollowUps: [] });

const followUps = (d: DashboardState) =>
  d.data.follow_ups
    .map((f, i) => ({ ...f, id: followUpId(i), contact_id: contactId(i), due_at: new Date(Date.UTC(2026, 5, f.overdue ? 23 : 24, 2)).toISOString(), version: 1, route: `/customers?c=${contactId(i)}` }))
    .filter((f) => !d.removedFollowUps.includes(f.id))
    .map(({ owner: _o, ai: _a, ...f }) => f);

export const dashboardRoutes: Record<string, MockRoute> = {
  '/dashboard': (db): DashboardDto => {
    const d = db.dashboard;
    const fu = followUps(d);
    return {
      stats: d.data.stats as DashboardDto['stats'],
      connect_groups: d.data.connect_groups as DashboardDto['connect_groups'],
      agents: d.data.agents,
      modules: d.data.modules,
      cdp: d.data.cdp,
      onboarding: {
        steps: d.data.onboarding_steps.map((s) => ({ ...s, key: s.key as OnboardingStepKey, done: !!d.stepsDone[s.key as OnboardingStepKey] })),
        done_count: Object.values(d.stepsDone).filter(Boolean).length,
      },
      follow_ups: fu.slice(0, 5),
      follow_up_count: fu.length,
      my_work: [
        { id: '0190f000-0000-7000-8000-000000000f81', type: 'approval', title: 'Gửi báo giá BG-1182 cho Chị Linh Phạm', sub: 'Chờ bạn duyệt', due_at: '2026-06-24T05:00:00.000Z', route: '/assistant/approvals' },
        { id: '0190f000-0000-7000-8000-000000000f82', type: 'handoff', title: 'Anh Quân Trần', sub: 'AI chuyển cho người — chờ phản hồi', due_at: '2026-06-24T02:10:00.000Z', route: '/inbox' },
        { id: '0190f000-0000-7000-8000-000000000f83', type: 'ticket_overdue', title: 'TK-204 · Đổi lịch liệu trình', sub: 'Ticket đã vượt SLA', due_at: '2026-06-24T01:30:00.000Z', route: '/tickets' },
        {
          id: '0190f000-0000-7000-8000-000000000f84',
          type: 'contract_renewal',
          title: 'HD-0012 · Cô Thu Hà',
          sub: 'Hợp đồng còn 21 ngày hết hạn',
          due_at: '2026-07-15T00:00:00.000Z',
          route: '/contracts',
          ask: 'Soạn đề xuất gia hạn hợp đồng HD-0012 cho khách Cô Thu Hà (chỉ soạn nháp, chưa gửi)',
        },
      ],
      ai_today: { runs: 128, actions: 46, handoffs: 9, credits: db.role === 'owner' ? 312 : null },
      credit: db.role === 'owner' ? { balance: 8420, days_estimate: 27, low: false } : null,
      news: d.data.news,
      notifications: d.data.notifications,
    };
  },
};

export const dashboardHandlers: Record<string, MockHandler> = {
  'onboarding.toggle_step': {
    execute: (db, input: { step: OnboardingStepKey; done: boolean }) => {
      db.dashboard.stepsDone[input.step] = input.done;
      return { done_count: Object.values(db.dashboard.stepsDone).filter(Boolean).length };
    },
  },
  'follow_up.complete': {
    execute: (db, input: { follow_up_id: string }) => {
      if (input.follow_up_id.startsWith('cfu_')) {
        if (!db.calendar.follow_done.includes(input.follow_up_id)) db.calendar.follow_done.push(input.follow_up_id);
        return { remaining: 0 };
      }
      const all = followUps({ ...db.dashboard, removedFollowUps: [] });
      if (!all.some((f) => f.id === input.follow_up_id)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'follow_up', fields: { follow_up_id: 'not_found' } });
      // Bấm lại việc đã xong: idempotent — không trừ "còn lại" hai lần.
      if (!db.dashboard.removedFollowUps.includes(input.follow_up_id)) db.dashboard.removedFollowUps.push(input.follow_up_id);
      return { remaining: followUps(db.dashboard).length };
    },
    undo: (db, input: { follow_up_id: string }) => {
      db.calendar.follow_done = db.calendar.follow_done.filter((id) => id !== input.follow_up_id);
      db.dashboard.removedFollowUps = db.dashboard.removedFollowUps.filter((id) => id !== input.follow_up_id);
    },
  },
};
