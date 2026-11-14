import { describe, expect, it } from 'vitest';
import {
  OPPORTUNITY_PIPELINE,
  OPPORTUNITY_PROBABILITY,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_TO_CONTACT_STAGE,
  contactStageOfOpen,
  forecastOf,
  isOpportunityClosed,
  nextOpportunityStage,
  opportunityRank,
} from './opportunity-stages';
import { CONTACT_STAGES } from './labels';

describe('bảng hằng giai đoạn cơ hội (COMMERCE §8)', () => {
  it('7 giai đoạn, xác suất cố định 10 · 25 · 50 · 70 · 85 · 100 · 0', () => {
    expect(OPPORTUNITY_STAGES).toEqual(['lead', 'qualified', 'demo', 'quote', 'negotiation', 'won', 'lost']);
    expect(OPPORTUNITY_STAGES.map((s) => OPPORTUNITY_PROBABILITY[s])).toEqual([10, 25, 50, 70, 85, 100, 0]);
  });

  it('ánh xạ sang giai đoạn khách dùng khoá enum khách hiện có', () => {
    expect(OPPORTUNITY_TO_CONTACT_STAGE).toEqual({ lead: 'lead', qualified: 'potential', demo: 'consulting', quote: 'quote', negotiation: 'contract', won: 'won' });
    for (const v of Object.values(OPPORTUNITY_TO_CONTACT_STAGE)) expect(CONTACT_STAGES).toContain(v);
  });

  it('thứ tự pipeline + Thua ngoài thứ tự; Đã mua / Thua là đóng', () => {
    expect(OPPORTUNITY_PIPELINE.map(opportunityRank)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(opportunityRank('lost')).toBe(-1);
    expect(['won', 'lost'].every((s) => isOpportunityClosed(s as 'won'))).toBe(true);
    expect(isOpportunityClosed('negotiation')).toBe(false);
  });

  it('bước kế: không tự đề xuất Đã mua (cần chứng từ), đóng → null', () => {
    expect(nextOpportunityStage('lead')).toBe('qualified');
    expect(nextOpportunityStage('quote')).toBe('negotiation');
    expect(nextOpportunityStage('negotiation')).toBeNull();
    expect(nextOpportunityStage('won')).toBeNull();
    expect(nextOpportunityStage('lost')).toBeNull();
  });
});

describe('forecastOf — giá trị × xác suất, half-up về đồng', () => {
  it('48tr ở Tư vấn / Demo → 24tr', () => expect(forecastOf('48000000', 'demo')).toBe('24000000'));
  it('làm tròn half-up', () => {
    expect(forecastOf('15', 'lead')).toBe('2'); // 1,5 → 2
    expect(forecastOf('14', 'lead')).toBe('1'); // 1,4 → 1
    expect(forecastOf(999_999_999_999n, 'negotiation')).toBe('849999999999');
  });
  it('Thua → 0; giá trị trống → null (không "0" giả)', () => {
    expect(forecastOf('48000000', 'lost')).toBe('0');
    expect(forecastOf(null, 'demo')).toBeNull();
    expect(forecastOf(undefined, 'demo')).toBeNull();
    expect(forecastOf('', 'demo')).toBeNull();
  });
});

describe('contactStageOfOpen — hạng cao nhất của cơ hội mở', () => {
  it('bỏ qua cơ hội đóng', () => {
    expect(contactStageOfOpen(['lead', 'negotiation', 'won', 'lost'])).toBe('contract');
    expect(contactStageOfOpen(['qualified'])).toBe('potential');
  });
  it('không có cơ hội mở → null', () => {
    expect(contactStageOfOpen([])).toBeNull();
    expect(contactStageOfOpen(['won', 'lost'])).toBeNull();
  });
});
