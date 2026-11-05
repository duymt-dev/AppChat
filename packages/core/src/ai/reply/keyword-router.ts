// Phân luồng từ khoá theo tài khoản kênh (TIP-022b B) — opt-in. Lượt khách ĐẦU TIÊN đủ điều kiện, hội thoại chưa có agent do người chọn:
// ứng viên đã cấu hình (đang chạy / đã xuất bản / trong giờ) khớp CỤM TỪ NGUYÊN VẸN đã chuẩn hoá (fold Unicode, ranh giới khoảng trắng /
// dấu câu). Thứ tự: ưu tiên tường minh giảm dần → cụm khớp dài nhất → id agent (ổn định). Không khớp → agent mặc định của tài khoản nếu đủ
// điều kiện, không thì hàng nhân viên. `cfg.channels` (loại kênh) KHÔNG phải quyền nhận mọi tài khoản. Không cấp tool mới.
import { foldText, type ChannelRoutingDto } from '@appchat/shared';

export interface RouteCandidate {
  agentId: string;
  priority: number;
  keywords: string[];
}

export interface RouteDecision {
  agentId: string | null;
  /** keyword:<cụm> | default | none */
  reason: string;
}

/** Chuẩn hoá để so cụm: fold dấu + chữ thường, mọi ký tự không phải chữ / số → một khoảng trắng, bao hai đầu bằng khoảng trắng. */
export const normalizePhrase = (s: string) => ` ${foldText(s).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;

/** Cụm khớp dài nhất của ứng viên trong tin (đã chuẩn hoá); '' = không khớp. */
export function longestMatch(text: string, keywords: readonly string[]): string {
  let best = '';
  for (const k of keywords) {
    const p = normalizePhrase(k);
    if (p.trim() && text.includes(p) && p.length > best.length) best = p;
  }
  return best.trim();
}

/**
 * Chọn agent. `eligible(id)` = agent đang chạy + đã xuất bản + trong giờ + được phép ở loại kênh này (người gọi kiểm). Thứ tự tất định
 * nên job trùng / khởi động lại cho cùng kết quả (kết quả còn được ghi vào receipt lượt — không chọn lại giữa lượt).
 */
export function routeByKeyword(text: string, routing: ChannelRoutingDto | undefined, fallback: string | null, eligible: (id: string) => boolean): RouteDecision {
  if (routing?.enabled && routing.candidates.length) {
    const t = normalizePhrase(text);
    const hits = routing.candidates
      .filter((c) => eligible(c.agent_id))
      .map((c) => ({ c, m: longestMatch(t, c.keywords) }))
      .filter((x) => x.m)
      .sort((a, b) => b.c.priority - a.c.priority || b.m.length - a.m.length || a.c.agent_id.localeCompare(b.c.agent_id));
    if (hits[0]) return { agentId: hits[0].c.agent_id, reason: `keyword:${hits[0].m}`.slice(0, 80) };
  }
  if (fallback && eligible(fallback)) return { agentId: fallback, reason: 'default' };
  return { agentId: null, reason: 'none' };
}
