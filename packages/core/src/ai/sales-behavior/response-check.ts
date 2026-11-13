// Kiểm khẳng định thương mại trước khi gửi khách (TIP-022c §3.6): một lượt model CHỈ ĐỌC (run consult con của lượt, chung ngân sách gốc,
// không tool) đánh dấu chữ sắp gửi có khẳng định tồn / giá / giao hàng / kết quả báo giá hay không. Không cấp được căn cứ còn thiếu, không
// đổi dữ kiện tồn. Chữ có khẳng định mà không đi qua kế hoạch có căn cứ → chặn tự gửi; không đọc được / mơ hồ → chặn (đóng an toàn). Bộ lọc
// ngữ nghĩa này KHÔNG chứng minh an toàn một mình — câu tồn / giá thật luôn do server dựng (response.ts) và bộ ca đối kháng cố định.
import { createHash } from 'node:crypto';
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { parseModelJson } from '@appchat/shared';
import { runOnce } from '../agents/agent.runtime';
import type { AiRunner } from '../runs/runner';

export const COMMERCIAL_CLAIMS = ['stock', 'price', 'delivery', 'quote_result'] as const;
export type CommercialClaim = (typeof COMMERCIAL_CLAIMS)[number];

export type CheckVerdict = { kind: 'clean' } | { kind: 'claims'; claims: CommercialClaim[] } | { kind: 'unreadable' };

export interface CheckDeps {
  db: TenantDb;
  runner: AiRunner;
  now: () => Date;
  ws: string;
  parentRunId: string;
  conversationId: string;
  locale: 'vi' | 'en';
  tier: string;
}

/** Đọc kết quả model: schema đóng; sai / mơ hồ → `unreadable` (chặn tự gửi). */
export function parseCheck(raw: string): CheckVerdict {
  let v: unknown;
  try {
    v = parseModelJson(raw);
  } catch {
    return { kind: 'unreadable' };
  }
  const o = (v ?? {}) as { claims?: unknown; ambiguous?: unknown };
  if (!Array.isArray(o.claims) || typeof o.ambiguous !== 'boolean' || o.ambiguous) return { kind: 'unreadable' };
  if (o.claims.some((c) => !COMMERCIAL_CLAIMS.includes(c as CommercialClaim))) return { kind: 'unreadable' };
  const claims = [...new Set(o.claims as CommercialClaim[])];
  return claims.length ? { kind: 'claims', claims } : { kind: 'clean' };
}

/** Một lượt kiểm (khoá con theo nội dung → gọi lại cùng chữ trong lượt dùng lại kết quả). Lỗi model / hết ngân sách → `unreadable`. */
export async function checkResponse(d: CheckDeps, text: string): Promise<CheckVerdict & { runId: string }> {
  const key = createHash('sha256').update(text).digest('hex').slice(0, 24);
  const r = await runOnce(d.db, d.runner, d.now, d.ws, {
    run: { kind: 'consult', title: 'sales-response-check', tier: d.tier, conversationId: d.conversationId, input: { action_id: 'sales.response_check', length: text.length } },
    system: prompt('sales-response-check', d.locale).text,
    prompt: `# CHỮ SẮP GỬI KHÁCH\n${JSON.stringify(text)}`,
    source: 'inbox',
    parent: { parentRunId: d.parentRunId, childKey: `sales-check:${key}` },
  }).catch(() => null);
  if (!r) return { kind: 'unreadable', runId: '' };
  if (r.status !== 'completed') return { kind: 'unreadable', runId: r.runId };
  return { ...parseCheck(r.text), runId: r.runId };
}
