// `find_actions` thật (TIP-023e §2.1, §4.2-4.3): một điểm dùng chung cho lượt đầu và lượt chạy tiếp (spec dựng qua specFor ở cả hai
// đường). Có route embed + generation ready → hybrid; còn lại honest keyword fallback (findActions cũ giữ làm nhánh fallback có tên).
// Câu hỏi chuẩn hoá Unicode/khoảng trắng + che PII (PiiMasker) TRƯỚC khi embed (§3.3). Embed có đo dưới chính run của lượt (019b).
// Lỗi dừng cứng (budget/credit/huỷ/usage không rõ) KHÔNG nuốt thành fallback — ném lên; lỗi provider khác → provider_unavailable.
import { PiiMasker, type ModelSource } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { isMeteringStop, queryEmbedder, type EmbedMeter } from '../../runs/metered-embedding';
import { RunStore } from '../../runs/run.store';
import { FIND_LIMIT, type AssistantMode, type Implemented } from '../catalog';
import type { AssistantTurnCtx } from '../types';
import { resolveEmbeddingSpace } from './embedding-space';
import { pinnedEmbedder } from './pinned-embedder';
import { discoverActions, type DiscoveryResult, type QueryVector } from './service';
import { embeddingSpaceKey } from './types';

export const QUERY_MAX = 1000;

/** Phụ thuộc tuỳ chọn: vắng (test cũ / process không có router) → luôn keyword fallback `no_model_route`. */
export interface DiscoveryRuntime {
  models: ModelSource | null;
  meter: EmbedMeter | null;
}

export const normalizeQuery = (q: string) => q.normalize('NFC').replace(/\s+/g, ' ').trim();

function queryVectorFor(db: TenantDb, t: AssistantTurnCtx, rt: DiscoveryRuntime, spaceKey: string, now: () => Date): QueryVector {
  return async (query) => {
    const run = await db.aiRun.findUnique({ where: { id: t.runId }, select: { id: true, rootRunId: true } });
    if (!run || !rt.models) return null;
    const store = new RunStore(db, now);
    const embed = queryEmbedder({ db: store.metered(), embedder: pinnedEmbedder(rt.models, spaceKey), meter: rt.meter, now }, { ws: t.ws, runId: run.id, rootRunId: run.rootRunId, source: 'assistant_discovery' });
    try {
      const e = await embed(new PiiMasker().mask(query));
      return e.vectors[0] ?? null;
    } catch (err) {
      if (isMeteringStop(err)) throw err;
      return null;
    }
  };
}

export async function runFindActions(
  d: { db: TenantDb; now: () => Date; discovery?: DiscoveryRuntime | null },
  t: AssistantTurnCtx,
  i: { query: string; module?: string; limit?: number },
  implemented: Implemented,
  mode: AssistantMode = t.mode,
): Promise<DiscoveryResult> {
  const query = normalizeQuery(i.query).slice(0, QUERY_MAX);
  const limit = Math.min(FIND_LIMIT, Math.max(1, i.limit ?? FIND_LIMIT));
  if (!query) return { actions: [], discovery: { strategy: 'none', corpus_version: null, cache_hit: false } };
  const rt = d.discovery ?? null;
  const space = rt ? await resolveEmbeddingSpace(rt.models) : null;
  const queryVector = rt && space ? queryVectorFor(d.db, t, rt, embeddingSpaceKey(space), d.now) : null;
  return discoverActions({ db: d.db, space, queryVector }, { authz: t.authz, mode, query, module: i.module, limit, implemented });
}
