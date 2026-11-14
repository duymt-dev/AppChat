// TIP-023e §2.3-§2.4: ranking.ts — RRF(k60) hợp nhất vector + từ khoá; action_id khớp CHÍNH XÁC tên luôn lên đầu NẾU còn hợp lệ sau
// lọc quyền (không lộ action người dùng không được gọi dù đúng tên); module restriction trước rank; tie-break tất định theo id.
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { fuseRanking, rankAndAuthorize, restrictModule, sortDeterministic } from '../src/ai/assistant/discovery/ranking';

const owner = authzForRole('owner', 'u1');
const cs = authzForRole('cs', 'u3');
const implementedAll = () => true;

describe('fuseRanking (RRF k60 + exact-id priority)', () => {
  it('hợp nhất hai danh sách, id xuất hiện ở cả hai nhánh có điểm cao hơn id chỉ ở một nhánh', () => {
    const fused = fuseRanking(['a', 'b', 'c'], ['b', 'd', 'a']);
    const score = new Map(fused.map((f) => [f.id, f.score]));
    expect(score.get('a')!).toBeGreaterThan(score.get('c')!);
    expect(score.get('b')!).toBeGreaterThan(score.get('d')!);
  });

  it('exactId có mặt ở một trong hai nhánh → luôn lên đầu, điểm +Infinity', () => {
    const fused = fuseRanking(['x', 'y'], ['z'], 'z');
    expect(fused[0]!.id).toBe('z');
    expect(fused[0]!.score).toBe(Number.POSITIVE_INFINITY);
  });

  it('exactId không có ở cả hai nhánh → không chèn, không ảnh hưởng thứ tự', () => {
    const fused = fuseRanking(['x', 'y'], ['z'], 'w');
    expect(fused.map((f) => f.id)).toEqual(expect.not.arrayContaining(['w']));
  });
});

describe('sortDeterministic — tie-break theo action ID', () => {
  it('cùng score → sắp theo id tăng dần', () => {
    const sorted = sortDeterministic([{ id: 'quote.send', score: 1 }, { id: 'contact.create', score: 1 }]);
    expect(sorted.map((s) => s.id)).toEqual(['contact.create', 'quote.send']);
  });
});

describe('restrictModule — lọc TRƯỚC khi rank', () => {
  it('chỉ giữ id khớp module', () => {
    const moduleOf = (id: string) => (id.startsWith('contact') ? 'crm' : 'sales');
    expect(restrictModule(['contact.create', 'quote.create'], 'crm', moduleOf)).toEqual(['contact.create']);
  });

  it('không có module → giữ nguyên danh sách', () => {
    expect(restrictModule(['a', 'b'], undefined, () => 'x')).toEqual(['a', 'b']);
  });
});

describe('rankAndAuthorize — đường ống đầy đủ (fuse → lọc quyền → limit)', () => {
  it('action vượt quyền bị loại SAU rank (selection không phải permission)', () => {
    const ranked = rankAndAuthorize({ vectorIds: ['quote.create', 'contact.create'], keywordIds: [], authz: cs, mode: 'cowork', implemented: implementedAll, limit: 8 });
    expect(ranked.map((r) => r.id)).not.toContain('quote.create');
  });

  it('exactId đúng tên nhưng ngoài quyền → KHÔNG lộ dù rank cao nhất', () => {
    const ranked = rankAndAuthorize({ vectorIds: [], keywordIds: ['quote.create'], exactId: 'quote.create', authz: cs, mode: 'cowork', implemented: implementedAll, limit: 8 });
    expect(ranked.map((r) => r.id)).not.toContain('quote.create');
  });

  it('limit cắt đúng số lượng sau khi đã rank + lọc quyền', () => {
    const ranked = rankAndAuthorize({ vectorIds: ['contact.create', 'contact.search', 'contact.update'], keywordIds: [], authz: owner, mode: 'cowork', implemented: implementedAll, limit: 2 });
    expect(ranked).toHaveLength(2);
  });
});
