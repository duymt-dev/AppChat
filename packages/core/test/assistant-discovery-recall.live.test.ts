// Đo top-8 recall HYBRID với embedding thật (TIP-023e §5) — chạy tay: `DISCOVERY_RECALL=1 pnpm --filter @appchat/core exec vitest run test/assistant-discovery-recall.live.test.ts`
// với EMBED_SEED_* trong môi trường. Không chạy CI (bỏ qua khi thiếu khoá). Cosine trong bộ nhớ trên corpus thật, RRF + quyền như service.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { buildCorpus } from '../src/ai/assistant/discovery/corpus';
import { rankAndAuthorize } from '../src/ai/assistant/discovery/ranking';
import { findActions } from '../src/ai/assistant/catalog';
import { filterAuthorized } from '../src/ai/assistant/discovery/authority';
import { registry } from '@appchat/actions';

const KEY = process.env.DISCOVERY_RECALL ? process.env.EMBED_SEED_API_KEY : undefined;
const MODEL = process.env.EMBED_SEED_MODEL ?? 'text-embedding-3-small';
async function embed(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 128) {
    const r = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { authorization: `Bearer ${KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: MODEL, input: texts.slice(i, i + 128) }) });
    if (!r.ok) throw new Error(`embed ${r.status}`);
    out.push(...((await r.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding));
  }
  return out;
}
const cos = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i]! * b[i]!; x += a[i]! ** 2; y += b[i]! ** 2; } return d / Math.sqrt(x * y); };

it.skipIf(!KEY)('hybrid recall với embedding thật', async () => {
  const fx = JSON.parse(readFileSync(join(__dirname, '../../../fixtures/ai-eval/assistant-discovery/ranking.json'), 'utf8')) as { groups: Record<string, string[]>; cases: { id: string; query: string; group: string }[] };
  const corpus = buildCorpus(() => true);
  const owner = authzForRole('owner', 'u1');
  const allowed = new Set(filterAuthorized(registry.map((a) => a.id), owner, 'cowork', () => true).map((a) => a.id));
  const docs = corpus.docs.filter((d) => allowed.has(d.actionId));
  const dv = await embed(docs.map((d) => d.text));
  const qv = await embed(fx.cases.map((c) => c.query));
  const miss: string[] = [];
  fx.cases.forEach((c, i) => {
    const vectorIds = docs.map((d, j) => ({ id: d.actionId, s: cos(qv[i]!, dv[j]!) })).sort((a, b) => b.s - a.s || a.id.localeCompare(b.id)).slice(0, 20).map((x) => x.id);
    const keywordIds = findActions(owner, 'cowork', c.query, undefined, 20, () => true).map((a) => a.id);
    const top = rankAndAuthorize({ vectorIds, keywordIds, authz: owner, mode: 'cowork', implemented: () => true, limit: 8 }).map((r) => r.id);
    if (!top.some((id) => fx.groups[c.group]!.includes(id))) miss.push(`${c.id} "${c.query}" → ${top.join(',')}`);
  });
  const report = `HYBRID recall@8 = ${fx.cases.length - miss.length}/${fx.cases.length} (${(((fx.cases.length - miss.length) / fx.cases.length) * 100).toFixed(1)}%) model=${MODEL} docs=${docs.length}\n${miss.join('\n')}`;
  process.stdout.write(`${report}\n`);
  // §5: top-8 recall ≥ 95% (đo 2026-11-10: 48/49 = 98,0%, text-embedding-3-small).
  expect((fx.cases.length - miss.length) / fx.cases.length, report).toBeGreaterThanOrEqual(0.95);
}, 300_000);
