// TIP-023e §5: fixture xếp hạng VI/EN (có dấu / không dấu, 9 nhóm nghiệp vụ) — đường keyword + RRF tất định (không model) phải đưa action
// đúng nhóm vào top-8 cho Owner / Cowork. Mục tiêu §5 "top-8 recall ≥ 95%" là của đường HYBRID với embedding thật (đo riêng); đây chỉ là
// SÀN CHỐNG HỒI QUY của nhánh keyword fallback, đặt đúng mức đo được 2026-11-10 (42/49 = 85,7%; 7 ca trượt ghi ở HANDOFF-NEXT 023e pha 11).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { discoverActions } from '../src/ai/assistant/discovery/service';

interface Fixture { groups: Record<string, string[]>; cases: { id: string; query: string; locale: string; group: string; vertical: string }[] }
const fx = JSON.parse(readFileSync(join(__dirname, '../../../fixtures/ai-eval/assistant-discovery/ranking.json'), 'utf8')) as Fixture;
const owner = authzForRole('owner', 'u1');
const db = {} as never;

describe('fixture xếp hạng discovery (§5)', () => {
  it('≥ 40 ca, đủ VI và EN, ≥ 6 nhóm nghiệp vụ', () => {
    expect(fx.cases.length).toBeGreaterThanOrEqual(40);
    expect(new Set(fx.cases.map((c) => c.locale))).toEqual(new Set(['vi', 'en']));
    expect(new Set(fx.cases.map((c) => c.vertical)).size).toBeGreaterThanOrEqual(6);
  });

  it('keyword fallback: top-8 recall không dưới mức đã đo (≥ 85%), ghi rõ ca trượt', async () => {
    const miss: string[] = [];
    for (const c of fx.cases) {
      const r = await discoverActions({ db, space: null, queryVector: null }, { authz: owner, mode: 'cowork', query: c.query, limit: 8, implemented: () => true });
      if (!r.actions.some((a) => fx.groups[c.group]!.includes(a.id))) miss.push(`${c.id} "${c.query}" → ${r.actions.map((a) => a.id).join(',')}`);
    }
    const recall = (fx.cases.length - miss.length) / fx.cases.length;
    expect(recall, miss.join('\n')).toBeGreaterThanOrEqual(0.85);
  });
});
