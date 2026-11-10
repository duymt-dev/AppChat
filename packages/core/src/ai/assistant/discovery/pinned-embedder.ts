// Embed ghim đúng MỘT candidate của generation (TIP-023e §1.6): "Pin one embedding space for every corpus and its queries... never
// accept model-supplied provider ID". Candidate luôn lấy từ chính ModelSource cấu hình hiện hành (Cài đặt › Mô hình AI) — KHÔNG từ
// input bên ngoài. So khớp bằng `embeddingSpaceKey` nguyên văn của generation (không parse ngược chuỗi khoá — `configRevision` của
// router đã tự chứa dấu `:` nên tách chuỗi theo `:` sẽ sai) — tính lại khoá của MỖI candidate hiện hành rồi so bằng, không suy ngược.
// Danh sách candidate chỉ còn ĐÚNG MỘT phần tử (hoặc rỗng) nên AiSdkEmbedder dựng trên đây không bao giờ rơi sang model khác khi lỗi
// (§1.6 "never mix fallback vectors into current generation"): route đã đổi/mất (space không còn trong candidate hiện hành) →
// NO_MODEL_ROUTE ngay, không âm thầm dùng model khác hay vector giả.
import { AiSdkEmbedder, type Embedder, type ModelSource } from '@appchat/ai';
import { DISCOVERY_EMBED_DIM } from '@appchat/shared';
import { embeddingSpaceKey } from './types';

function pinnedSource(models: ModelSource, spaceKey: string): ModelSource {
  return {
    async candidates(tier, purpose, needs) {
      const all = await models.candidates(tier, purpose, needs);
      const match = all.find((c) => embeddingSpaceKey({ provider: c.provider, model: c.model, dimension: DISCOVERY_EMBED_DIM, configRevision: c.configRevision ?? '' }) === spaceKey);
      return match ? [match] : [];
    },
  };
}

/** `spaceKey`: `embeddingSpaceKey()` đã lưu ở `action_discovery_generation.embedding_space` lúc claim. */
export function pinnedEmbedder(models: ModelSource, spaceKey: string): Embedder {
  return new AiSdkEmbedder(pinnedSource(models, spaceKey));
}
