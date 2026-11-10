// Dựng kho mô tả action xác định (TIP-023e §1.1-§1.2): registry → văn bản chuẩn hoá (id + mô tả en + nhãn vi/en + module/risk),
// sắp theo action ID, hash document + hash khuôn input (023b canonical) riêng biệt. KHÔNG đưa bản ghi nghiệp vụ / prompt riêng của
// agent / ví dụ khách hàng / giá trị input lúc chạy vào văn bản — chỉ dữ liệu TĨNH của registry (mô tả viết cho model, không phải dữ
// liệu người dùng). Document quá khổ bị HASH (không cắt rồi coi là tương đương) — build thất bại nếu không serialize được khuôn input.
import { createHash } from 'node:crypto';
import { registry, type ActionDef } from '@appchat/actions';
import { DISCOVERY_CORPUS_MAX_BYTES, DISCOVERY_DOC_MAX_CHARS, DISCOVERY_LABEL_VERSION, DISCOVERY_MAX_ACTIONS, DISCOVERY_RANKING_VERSION, serverMessages } from '@appchat/shared';
import { inputSchemaOf } from '../../runs/tools';
import { stableJson } from '../../../kernel/actions/confirm-token';
import { entityOf } from '../catalog';
import type { DiscoveryCorpus, DiscoveryDoc } from './types';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Văn bản tìm được của một action: id tách dấu, mô tả (en, viết cho model), nhãn vi/en theo đối tượng + module, risk. Không dịch
 *  thêm — labels dùng ĐÚNG cột đã có ở catalog.ts (serverMessages(l).ai.assistant.entity/module) để không lệch hai nguồn nhãn. */
function textOf(a: ActionDef): string {
  const parts = [a.id.replaceAll('.', ' ').replaceAll('_', ' '), a.description, a.module, a.risk];
  for (const l of ['vi', 'en'] as const) {
    const m = serverMessages(l).ai.assistant;
    const entity = (m.entity as Record<string, string>)[entityOf(a.id)] ?? '';
    // Cụm động từ + đối tượng ĐÚNG như tiêu đề thẻ xác nhận (card.ts) — "Tạo khách hàng" / "Gửi báo giá" — một nguồn nhãn, không dịch thêm.
    const verb = (m.verbOf as Record<string, string>)[a.id] ?? (/\.create(_and_publish)?$/.test(a.id) ? m.verb.create : ((m.verb as Record<string, string>)[a.risk] ?? ''));
    if (verb && entity) parts.push(`${verb} ${entity}`);
    parts.push(entity);
    parts.push((m.module as Record<string, string>)[a.module] ?? '');
  }
  return parts.filter(Boolean).join(' ').slice(0, DISCOVERY_DOC_MAX_CHARS);
}

/** Khuôn input hash riêng (độc lập văn bản mô tả) — đổi khuôn input (023b canonical) cũng phải đổi corpus dù mô tả giữ nguyên.
 *  Serialize lỗi (schema không chuẩn — không nên xảy ra với registry đã qua defineAction) ném lỗi rõ, không âm thầm bỏ qua action. */
function schemaHashOf(a: ActionDef): string {
  let json: string;
  try {
    json = stableJson(inputSchemaOf(a));
  } catch (e) {
    throw new Error(`action_discovery: không serialize được khuôn input của ${a.id} — ${(e as Error).message}`);
  }
  return sha256(json);
}

/** Danh sách action đưa vào kho: registry đã triển khai (implemented), KHÔNG lọc theo quyền — quyền lọc lúc TRUY VẤN
 *  (discovery/authority.ts, pha sau), không lọc lúc build (một kho dùng chung mọi thành viên của workspace). */
export function buildCorpus(implemented: (id: string) => boolean): DiscoveryCorpus {
  const actions = registry.filter((a) => implemented(a.id)).sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  if (actions.length > DISCOVERY_MAX_ACTIONS) throw new Error(`action_discovery: ${actions.length} action vượt trần ${DISCOVERY_MAX_ACTIONS}`);
  const docs: DiscoveryDoc[] = actions.map((a) => {
    const text = textOf(a);
    return { actionId: a.id, text, documentHash: sha256(text), schemaHash: schemaHashOf(a) };
  });
  const bytes = docs.reduce((n, d) => n + Buffer.byteLength(d.text, 'utf8'), 0);
  if (bytes > DISCOVERY_CORPUS_MAX_BYTES) throw new Error(`action_discovery: kho ${bytes} byte vượt trần ${DISCOVERY_CORPUS_MAX_BYTES}`);
  // corpus_hash (§1.2): id đã sắp + hash document + hash schema + phiên bản nhãn + phiên bản thuật toán xếp hạng — đổi BẤT KỲ phần
  // nào (registry, nhãn vi/en, cách xếp hạng) đều ra corpus_hash khác, không ghi đè generation cũ bằng registry mới.
  const corpusHash = sha256(stableJson({ ids: docs.map((d) => d.actionId), docHashes: docs.map((d) => d.documentHash), schemaHashes: docs.map((d) => d.schemaHash), labelVersion: DISCOVERY_LABEL_VERSION, rankingVersion: DISCOVERY_RANKING_VERSION }));
  return { docs, corpusHash };
}
