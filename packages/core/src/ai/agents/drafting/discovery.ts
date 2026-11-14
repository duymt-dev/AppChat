// Tìm action cấp được TRƯỚC khi sinh cấu hình agent (TIP-021b §1.3–1.5): dùng lại service discovery 023e (không corpus / quyền thứ hai)
// với bộ lọc mục đích `agentGrantable` áp trước rank / limit. Mô tả 4–2000 ký tự → tối đa 3 đoạn liền kề ≤ 1000 code unit UTF-16 (cắt
// ở biên an toàn, giữ đủ chữ), mỗi đoạn một truy vấn limit 8 dưới cùng gốc; gộp bỏ trùng theo id, thứ tự (hạng, id) tất định, ≤ 24 ứng
// viên. Kho lạnh → từ khoá trung thực; không gọi `assistant.discovery_prepare`, không dựng kho. Không ứng viên là kết quả hợp lệ.
import { createHash } from 'node:crypto';
import { isAgentGrantable, isInternalAction, registry, type ActionDef } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { stableJson } from '../../../kernel/actions/confirm-token';
import { inputSchemaOf } from '../../runs/tools';
import type { Implemented } from '../../assistant/catalog';
import { discoverActions, type DiscoveryStrategy, type FallbackReason, type QueryVector } from '../../assistant/discovery/service';
import { resolveEmbeddingSpace } from '../../assistant/discovery/embedding-space';
import { embeddingSpaceKey, type EmbeddingSpace } from '../../assistant/discovery/types';
import type { DiscoveryCache } from '../../assistant/discovery/cache';

export const CHUNK_MAX = 1000;
export const CHUNK_LIMIT = 3;
export const PER_QUERY = 8;
export const CANDIDATE_MAX = 24;
const META_MAX = 2000;

const BY_ID = new Map(registry.map((a) => [a.id, a]));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Chỉ action public + agentGrantable (không internal) — giao thêm với quyền / có handler / chế độ ở `currentlyAllowed` của 023e. */
export const grantableForAgent = (a: ActionDef): boolean => isAgentGrantable(a) && !isInternalAction(a);

export interface DraftCandidate {
  id: string;
  module: string;
  risk: string;
  /** Mô tả an toàn (registry, viết cho model) — cắt ≤ 2000 ký tự. Không bản ghi khách. */
  description: string;
  schemaHash: string;
  rank: number;
}

export interface DraftDiscovery {
  candidates: DraftCandidate[];
  strategy: DiscoveryStrategy;
  reason?: FallbackReason;
  corpusVersion: string | null;
  /** Vân tay (id + băm khuôn input + phiên bản corpus) — so lại lúc công bố (đổi đáng kể → 409 stale). */
  fingerprint: string;
}

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;

/**
 * Chia mô tả (đã chuẩn hoá NFC + gộp khoảng trắng) thành đoạn liền kề ≤ CHUNK_MAX code unit, không tách cặp surrogate, ưu tiên cắt ở
 * khoảng trắng gần cuối đoạn. Ghép lại các đoạn = chuỗi gốc (không mất chữ). Tối đa 3 đoạn (2000 ký tự cần đoạn thứ ba khi biên an toàn
 * lùi về trước).
 */
export function chunkDescription(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length && out.length < CHUNK_LIMIT) {
    let end = Math.min(text.length, i + CHUNK_MAX);
    if (end < text.length) {
      if (isHigh(text.charCodeAt(end - 1))) end--;
      const space = text.lastIndexOf(' ', end - 1);
      if (space > i + CHUNK_MAX / 2) end = space + 1;
    }
    out.push(text.slice(i, end));
    i = end;
  }
  return out.filter((c) => c.trim().length > 0);
}

export const normalizeDescription = (d: string) => d.normalize('NFC').replace(/\s+/g, ' ').trim();

export function schemaHashOf(id: string): string {
  const a = BY_ID.get(id);
  return a ? sha(stableJson(inputSchemaOf(a))) : '';
}

export function fingerprintOf(ids: readonly string[], corpusVersion: string | null): string {
  return sha(stableJson({ ids: [...ids].sort(), schemas: [...ids].sort().map(schemaHashOf), corpus: corpusVersion ?? '' }));
}

export interface DraftDiscoveryDeps {
  db: Parameters<typeof discoverActions>[0]['db'] & Pick<TenantDb, 'aiRun'>;
  models: Parameters<typeof resolveEmbeddingSpace>[0];
  /** Embed câu hỏi có đo dưới run soạn (019b) — vắng → từ khoá `no_model_route`. */
  queryVector: ((space: EmbeddingSpace) => QueryVector) | null;
  cache?: { store: DiscoveryCache; ws: string; rootRunId: string; userId: string } | null;
}

/** Discovery theo đoạn → ứng viên đã lọc quyền hiện hành ∩ cấp được cho agent. Chế độ `cowork` (action ghi được — agent cần ghi). */
export async function discoverDraftTools(d: DraftDiscoveryDeps, authz: AuthzContext, implemented: Implemented, description: string): Promise<DraftDiscovery> {
  const chunks = chunkDescription(normalizeDescription(description));
  const space = await resolveEmbeddingSpace(d.models);
  const queryVector = space && d.queryVector ? d.queryVector(space) : null;
  const merged = new Map<string, number>();
  let strategy: DiscoveryStrategy = 'none';
  let reason: FallbackReason | undefined;
  let corpusVersion: string | null = null;
  for (const query of chunks) {
    const r = await discoverActions({ db: d.db, space, queryVector, cache: d.cache ?? null }, { authz, mode: 'cowork', query, limit: PER_QUERY, implemented, admit: grantableForAgent });
    if (r.discovery.strategy === 'hybrid') strategy = 'hybrid';
    else if (r.discovery.strategy === 'keyword' && strategy === 'none') strategy = 'keyword';
    reason ??= r.discovery.reason;
    corpusVersion ??= r.discovery.corpus_version;
    r.actions.forEach((a, rank) => merged.set(a.id, Math.min(merged.get(a.id) ?? rank, rank)));
  }
  if (strategy === 'hybrid') reason = undefined;
  const candidates = [...merged.entries()]
    .sort((x, y) => x[1] - y[1] || x[0].localeCompare(y[0]))
    .slice(0, CANDIDATE_MAX)
    .map(([id, rank]) => {
      const a = BY_ID.get(id)!;
      return { id, module: a.module, risk: a.risk, description: a.description.slice(0, META_MAX), schemaHash: schemaHashOf(id), rank };
    });
  return { candidates, strategy, ...(reason ? { reason } : {}), corpusVersion, fingerprint: fingerprintOf(candidates.map((c) => c.id), corpusVersion) };
}

export { embeddingSpaceKey };
