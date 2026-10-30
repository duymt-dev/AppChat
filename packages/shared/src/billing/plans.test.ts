// TIP-009: danh mục gói khớp prototype (giá, credit / tháng, hạn mức), luật trial, tính credit, mức cảnh báo.
import { describe, expect, it } from 'vitest';
import fixture from '../../../../fixtures/prototype-parity/settings.json';
import { PLAN_SEEDS, CREDIT_PACKS, ADDONS } from './catalog';
import { TRIAL_PLAN_KEY, creditsFor, warnLevel } from './rules';

describe('PLAN_SEEDS', () => {
  it('8 gói đúng thứ tự + giá như prototype', () => {
    const proto = [...fixture.billing.plans.personal, ...fixture.billing.plans.business];
    expect(PLAN_SEEDS.map((p) => [p.key, p.price_month])).toEqual(proto.map((p) => [p.key, p.price]));
    expect(CREDIT_PACKS).toEqual(fixture.billing.credit_packs);
    expect(ADDONS).toEqual(fixture.billing.addons);
  });

  it('hạn mức theo bảng so sánh: Cá nhân Pro (trial) 8 kênh / 5 agent / 10.000 credit; Ultimate kênh không giới hạn', () => {
    const by = Object.fromEntries(PLAN_SEEDS.map((p) => [p.key, p]));
    expect(by[TRIAL_PLAN_KEY]).toMatchObject({ max_users: 1, max_channels: 8, max_agents: 5, credits_month: 10_000 });
    expect(by.free).toMatchObject({ max_users: 1, max_channels: 1, max_agents: 1, credits_month: 500 });
    expect(by.ultimate).toMatchObject({ max_users: 15, max_channels: null, max_agents: null, credits_month: 200_000 });
    expect(by.enterprise).toMatchObject({ price_month: null, max_users: null, credits_month: null });
  });
});

describe('luật credit', () => {
  it('credit làm tròn lên theo đơn giá / 1k token', () => {
    expect(creditsFor(1000, 500, { per1kIn: 2, per1kOut: 6 })).toBe(5);
    expect(creditsFor(10, 0, { per1kIn: 1, per1kOut: 1 })).toBe(1);
    expect(creditsFor(0, 0, { per1kIn: 1, per1kOut: 1 })).toBe(0);
  });

  it('mức cảnh báo theo % hạn mức tháng đã dùng', () => {
    expect(warnLevel(10_000, 10_000)).toBeNull();
    expect(warnLevel(2_001, 10_000)).toBeNull();
    expect(warnLevel(2_000, 10_000)).toBe(80);
    expect(warnLevel(500, 10_000)).toBe(95);
    expect(warnLevel(0, null)).toBeNull();
  });
});
