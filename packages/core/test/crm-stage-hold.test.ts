// TIP-015g AC1 (phần thuần): mốc cắt giữ 24 giờ tuyệt đối (không theo múi giờ / DST), luật hạng nâng / lùi / Đã mua không bao giờ hạ,
// ràng buộc khoá họ của transaction — thiếu ràng buộc thì từ chối (không tự khoá khách sau chứng từ).
import { describe, expect, it } from 'vitest';
import { MANUAL_HOLD_MS, holdCutoff, wantsMove } from '../src/crm/stage/rules';
import { bindStageFamily, stageBinding } from '../src/crm/stage/types';

describe('mốc giữ 24 giờ', () => {
  it('cắt = now − 86 400 000 ms, tính cả qua đổi giờ mùa hè (thời lượng tuyệt đối)', () => {
    expect(MANUAL_HOLD_MS).toBe(86_400_000);
    const now = new Date('2026-03-29T01:30:00.000Z'); // đêm đổi giờ châu Âu — không ảnh hưởng
    expect(now.getTime() - holdCutoff(now).getTime()).toBe(86_400_000);
  });
});

describe('luật hạng (COMMERCE §8)', () => {
  it('nâng chỉ khi thấp hơn; lùi chỉ từ mốc cao hơn, không từ Mất; Đã mua không bao giờ đổi', () => {
    expect(wantsMove('consulting', 'raise', 'quote')).toBe(true);
    expect(wantsMove('contract', 'raise', 'quote')).toBe(false);
    expect(wantsMove('lost', 'raise', 'quote')).toBe(true);
    expect(wantsMove('quote', 'fallback', 'consulting')).toBe(true);
    expect(wantsMove('lead', 'fallback', 'consulting')).toBe(false);
    expect(wantsMove('lost', 'fallback', 'consulting')).toBe(false);
    expect(wantsMove('won', 'raise', 'won')).toBe(false);
    expect(wantsMove('won', 'fallback', 'consulting')).toBe(false);
  });
});

describe('ràng buộc khoá họ', () => {
  it('chỉ transaction đã khoá họ mới áp được luật; transaction khác / khách ngoài họ → 500', () => {
    const tx = {};
    bindStageFamily(tx, { rootId: 'b', ids: ['a', 'b'] });
    expect(stageBinding(tx, 'a').rootId).toBe('b');
    expect(() => stageBinding(tx, 'c')).toThrowError(expect.objectContaining({ httpStatus: 500 }));
    expect(() => stageBinding({}, 'a')).toThrowError(expect.objectContaining({ httpStatus: 500 }));
  });
});
