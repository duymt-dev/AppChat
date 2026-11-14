// Ghim không gian embedding hiện hành cho kho mô tả action (TIP-023e §1.2, §1.6): CHỈ đọc cấu hình route embed đang phục vụ (ứng
// viên ưu tiên cao nhất, như Embedder thật sẽ dùng) — KHÔNG gọi provider, không tiêu Credit. Model-supplied provider ID không bao
// giờ được chấp nhận (§1.6 "never accept model-supplied provider ID") — đây là nguồn DUY NHẤT xác định không gian, lấy từ
// RouterConfigSource/ModelSource đã cấu hình ở Cài đặt › Mô hình AI.
import type { ModelSource } from '@appchat/ai';
import { DISCOVERY_EMBED_DIM } from '@appchat/shared';
import type { EmbeddingSpace } from './types';

/** Ứng viên embed ưu tiên cao nhất hiện hành (mức `standard` — embed không phân mức, mirror `embedder.ts`), hoặc null nếu chưa
 *  cấu hình route embed nào (§1.4 "Missing configured embedding route yields keyword fallback no_model_route"). */
export async function resolveEmbeddingSpace(models: ModelSource | null): Promise<EmbeddingSpace | null> {
  if (!models) return null;
  const [top] = await models.candidates('standard', 'embed', { tools: false });
  if (!top) return null;
  // configRevision vắng (mock / test cũ — router chưa ghép được) → chuỗi rỗng, vẫn ghim được một không gian ổn định cho môi
  // trường đó (không literal "undefined" lẫn vào khoá — embeddingSpaceKey ghép bằng dấu `:` nên chuỗi rỗng là phần tử hợp lệ).
  return { provider: top.provider, model: top.model, dimension: DISCOVERY_EMBED_DIM, configRevision: top.configRevision ?? '' };
}
