// TIP-038 pha 1 (unit) — luật thuần của registry metric: allowlist + tham số strict theo metric, cửa sổ [from, to) theo múi workspace (đúng
// cả múi có giờ mùa hè, không cộng 86 400 giây), mặc định 30 ngày / tối đa 366, bucket ngày / tuần (Thứ Hai) / tháng phủ đủ kỳ ≤ 100;
// quyền nguồn (insights.view là cổng, mỗi nguồn cần quyền module + scope ≠ none) và scope insights ∩ scope domain.
import { describe, expect, it } from 'vitest';
import { AppError, INSIGHT_LIMITS, authzForRole, bucketKey, bucketKeys, defaultBucket, isMetricKey } from '@appchat/shared';
import { insightAuthz, parseParams, resolveWindow, sourceDenial } from '../src/insights/metrics/common';

const NOW = new Date('2026-11-06T02:00:00.000Z'); // 09:00 Asia/Ho_Chi_Minh
const VN = 'Asia/Ho_Chi_Minh';
const err = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e instanceof AppError ? { code: e.code, status: e.httpStatus, fields: e.fields } : e;
  }
  return null;
};

describe('metric allowlist + tham số', () => {
  it('chỉ metric định nghĩa sẵn; SQL / tên bảng không phải metric', () => {
    expect(isMetricKey('sales.collected')).toBe(true);
    expect(isMetricKey('revenue')).toBe(false);
    expect(isMetricKey('SELECT * FROM "order"')).toBe(false);
  });

  it('khoá lạ / sai kiểu → 422 kèm đường dẫn; số dạng chuỗi (query string) được ép', () => {
    expect(err(() => parseParams('sales.booked', { from: '2026-10-01', sql: 'DROP TABLE x' }))).toMatchObject({ code: 'VALIDATION_FAILED', status: 422, fields: { 'params._': 'unrecognized_keys' } });
    expect(err(() => parseParams('sales.booked', { bucket: 'hour' }))).toMatchObject({ fields: { 'params.bucket': expect.any(String) } });
    expect(err(() => parseParams('customers.at_risk', { limit: 500 }))).toMatchObject({ fields: { 'params.limit': 'too_big' } });
    expect(parseParams('customers.at_risk', { limit: '5', days: '60' })).toEqual({ limit: 5, days: 60 });
    expect(err(() => parseParams('agents.performance', { agent_id: "1' OR '1'='1" }))).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});

describe('cửa sổ [from, to) theo múi workspace', () => {
  it('mặc định: 30 ngày tới hết hôm nay (giờ workspace) — mốc UTC = 00:00 giờ tường', () => {
    const w = resolveWindow({}, VN, NOW, true);
    expect(w).toMatchObject({ from: '2026-10-08', to: '2026-11-07', bucket: 'day' });
    expect(w.fromUtc.toISOString()).toBe('2026-10-07T17:00:00.000Z');
    expect(w.toUtc.toISOString()).toBe('2026-11-06T17:00:00.000Z');
  });

  it('nửa mở: to loại trừ; from ≥ to hoặc > 366 ngày → 422', () => {
    expect(err(() => resolveWindow({ from: '2026-11-01', to: '2026-11-01' }, VN, NOW, false))).toMatchObject({ fields: { 'params.to': 'must_be_after_from' } });
    expect(err(() => resolveWindow({ from: '2025-01-01', to: '2026-11-01' }, VN, NOW, false))).toMatchObject({ fields: { 'params.from': 'window_too_long' } });
    expect(resolveWindow({ from: '2025-11-01', to: '2026-11-02' }, VN, NOW, false).from).toBe('2025-11-01'); // đúng 366 ngày
    expect(err(() => resolveWindow({ from: '2026-02-30', to: '2026-03-02' }, VN, NOW, false))).toMatchObject({ fields: { 'params.from': 'invalid_date' } });
  });

  it('giờ mùa hè: mốc theo lệch tại chính ngày đó (Châu Âu đổi giờ 2026-10-25)', () => {
    const w = resolveWindow({ from: '2026-10-24', to: '2026-10-26' }, 'Europe/Berlin', NOW, false);
    expect(w.fromUtc.toISOString()).toBe('2026-10-23T22:00:00.000Z'); // CEST +02
    expect(w.toUtc.toISOString()).toBe('2026-10-25T23:00:00.000Z'); // CET +01 — kỳ dài 49 giờ, không phải 48
  });

  it('bucket tuần bắt đầu Thứ Hai, tháng ngày 1; phủ đủ kỳ, không trùng; mặc định ≤ 100 kỳ', () => {
    expect(bucketKey('2026-11-08', 'week')).toBe('2026-11-02');
    expect(bucketKey('2026-11-08', 'month')).toBe('2026-11-01');
    expect(bucketKeys('2026-10-30', '2026-11-10', 'week')).toEqual(['2026-10-26', '2026-11-02', '2026-11-09']);
    expect(bucketKeys('2026-01-15', '2026-03-02', 'month')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    for (const d of [1, 62, 63, 182, 183, INSIGHT_LIMITS.maxDays]) {
      const b = defaultBucket(d);
      expect(bucketKeys('2026-01-01', resolveWindow({ from: '2026-01-01', to: new Date(Date.parse('2026-01-01') + d * 86_400_000).toISOString().slice(0, 10) }, VN, NOW, false).to, b).length).toBeLessThanOrEqual(INSIGHT_LIMITS.maxRows);
    }
  });
});

describe('quyền nguồn + scope insights ∩ domain', () => {
  const sales = authzForRole('sales', 'u-sales');
  const cs = authzForRole('cs', 'u-cs');
  const owner = { ...authzForRole('owner', 'u-owner'), isOwner: true };

  it('nguồn cần quyền module + scope ≠ none (không suy Owner từ tên vai trò)', () => {
    expect(sourceDenial(sales, ['order.view'], 'sales')).toBeNull();
    expect(sourceDenial(cs, ['order.view'], 'sales')).toBe('permission:order.view');
    expect(sourceDenial(sales, ['invoice.manage', 'payment.record'], 'sales')).toBeNull();
    expect(sourceDenial({ ...sales, scope: { ...sales.scope, sales: 'none' } }, ['order.view'], 'sales')).toBe('scope:sales');
    expect(sourceDenial({ ...sales, roleKey: 'owner' }, ['billing.manage'], null)).toBe('permission:billing.manage');
    expect(sourceDenial(owner, ['billing.manage'], 'sales')).toBeNull();
  });

  it('scope insights thu hẹp scope domain (own ∩ all = own; none chặn hết); không bao giờ mở rộng', () => {
    const wide = { ...cs, scope: { ...cs.scope, crm: 'all' as const, insights: 'own' as const } };
    expect(insightAuthz(wide).scope).toMatchObject({ crm: 'own', sales: 'none', inbox: 'own' });
    expect(insightAuthz({ ...sales, scope: { ...sales.scope, insights: 'none' } }).scope).toMatchObject({ crm: 'none', sales: 'none', support: 'none' });
    const narrow = { ...sales, scope: { ...sales.scope, insights: 'all' as const } };
    expect(insightAuthz(narrow).scope).toMatchObject({ sales: 'own', crm: 'own' });
    expect(insightAuthz(owner)).toBe(owner);
  });
});
