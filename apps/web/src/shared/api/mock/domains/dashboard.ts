// Mock Tổng quan: GET /dashboard + onboarding.toggle_step + follow_up.complete. Dữ liệu = prototype L1079–1177, L9201–9233.
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

export const createDashboardState = (): DashboardState => ({ data: structuredClone(fixture), stepsDone: {}, removedFollowUps: [] });

export const dashboardRoutes: Record<string, MockRoute> = {
  '/dashboard': (db) => {
    const d = db.dashboard;
    const data = d.data;
    return {
      ...data,
      onboarding: {
        steps: d.data.onboarding_steps.map((s) => ({ ...s, done: !!d.stepsDone[s.key as OnboardingStepKey] })),
        done_count: Object.values(d.stepsDone).filter(Boolean).length,
      },
      follow_ups: data.follow_ups.filter((f) => !d.removedFollowUps.includes(f.id)),
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
      db.dashboard.removedFollowUps.push(input.follow_up_id);
      return { remaining: db.dashboard.data.follow_ups.length - db.dashboard.removedFollowUps.length };
    },
    undo: (db, input: { follow_up_id: string }) => {
      db.dashboard.removedFollowUps = db.dashboard.removedFollowUps.filter((id) => id !== input.follow_up_id);
    },
  },
};
