// Bộ ca của `pnpm ai:live` (TIP-023b R1.4 · eval.md §2): schema chặt + nạp an toàn. Mặc định 30 ca `cases.yaml` (bất biến); `--cases <path>`
// chọn suite bổ sung JSON / YAML trong repo, chạy và báo cáo riêng (không đổi mẫu số 30, không rơi về bộ mặc định khi file lỗi).
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';

export const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
export const DEFAULT_CASES = join(REPO_ROOT, 'tools', 'ai-live', 'cases.yaml');
export const DEFAULT_COUNT = 30;
const MAX_BYTES = 256 * 1024;

export const CATEGORIES = ['lookup', 'update', 'create', 'delete', 'chain', 'clarify', 'genui', 'connect', 'draft', 'contract', 'memory', 'loyalty', 'hardening', 'channel', 'marketing', 'insights', 'transfer', 'runtime', 'activity', 'ctransfer', 'cedit', 'lifecycle', 'merge', 'tenant_mail', 'booking', 'ai_utility', 'input', 'stage_hold', 'agent_draft', 'record', 'kb_scope', 'citation', 'plan', 'appt_order', 'record_files', 'product_media'] as const;
/** Phân bổ bộ mặc định (TIP-023b R1.4): tra cứu 8 · sửa 6 · tạo 6 · xoá / huỷ 3 · chuỗi 4 · hỏi lại 3. */
export const DEFAULT_MIX: Record<(typeof CATEGORIES)[number], number> = { lookup: 8, update: 6, create: 6, delete: 3, chain: 4, clarify: 3, genui: 0, connect: 0, draft: 0, contract: 0, memory: 0, loyalty: 0, hardening: 0, channel: 0, marketing: 0, insights: 0, transfer: 0, runtime: 0, activity: 0, ctransfer: 0, cedit: 0, lifecycle: 0, merge: 0, tenant_mail: 0, booking: 0, ai_utility: 0, input: 0, stage_hold: 0, agent_draft: 0, record: 0, kb_scope: 0, citation: 0, plan: 0, appt_order: 0, record_files: 0, product_media: 0 };

const expectSchema = z
  .object({
    /** Action cuối cùng model phải gọi (`call_action`); bỏ trống với ca hỏi lại. */
    action: z.string().regex(/^[a-z_]+\.[a-z0-9_.]+$/).optional(),
    /** Action cuối được chấp nhận khi có nhiều đường đọc đúng cùng bản ghi (vd `contact.get` | `contact.get_360`) — thay cho `action`. */
    action_any: z.array(z.string().regex(/^[a-z_]+\.[a-z0-9_.]+$/)).min(2).max(4).optional(),
    /** Các action phải xuất hiện theo thứ tự (chuỗi nhiều bước). */
    sequence: z.array(z.string().regex(/^[a-z_]+\.[a-z0-9_.]+$/)).max(8).optional(),
    /** Ô bắt buộc phải khớp (đường dẫn chấm `patch.phone`; giá trị `$seed.<…>` lấy từ seed). */
    input: z.record(z.string().max(80), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
    /** Ghi → phải có thẻ xác nhận; đọc → không được có. */
    confirm: z.boolean(),
    /** Model phải hỏi lại, không gọi action ghi. */
    ask_back: z.boolean().default(false),
    /** GenUI (TIP-023c, genui-judge.ts): cây / `$ref` / form gắn action / ca tiêm lệnh không có nút hành động. */
    ui: z.object({ tree: z.boolean().optional(), refs: z.boolean().optional(), form: z.string().regex(/^[a-z_]+\.[a-z0-9_.]+$/).optional(), no_action_ui: z.boolean().optional() }).strict().optional(),
    /** Nháp Hộp thư (REQ-C05c): chỉ chữ đề xuất, không action / thẻ / cây. */
    draft: z.boolean().optional(),
    /** AI soạn hợp đồng (TIP-030b F2, contract-judge.ts): giá trị = Σ giá danh mục, số dòng ngoài danh mục, số gợi ý tối thiểu, không gửi / ký. */
    contract: z
      .object({ value: z.string().regex(/^\d+$/).optional(), off_catalog: z.number().int().min(0).optional(), min_suggestions: z.number().int().min(0).optional(), template_unchanged: z.boolean().optional(), no_send: z.boolean().optional() })
      .strict()
      .optional(),
    /** Trí nhớ khách (TIP-015b, memory-judge.ts) — chấm theo DB: fact phải có / phải được nhắc lại / không được lưu (PII, mâu thuẫn) / số fact mới tối đa. */
    memory: z
      .object({ stored: z.array(z.string().max(120)).max(5).optional(), recalled: z.string().max(120).optional(), absent: z.array(z.string().max(120)).max(5).optional(), max_new: z.number().int().min(0).optional() })
      .strict()
      .optional(),
    /** Khách thân thiết (TIP-036 AC9, loyalty-judge.ts) — chấm theo DB: câu trả lời nói đúng điểm / hạng / giá trị quy đổi / trần 50%;
     *  `unchanged` = số dư khách + số đã thu của đề nghị không đổi (mọi thẻ bị huỷ); `any_card` = có / không thẻ đều chấp nhận. */
    loyalty: z
      .object({ says: z.array(z.enum(['points', 'tier', 'value', 'cap'])).max(4).optional(), unchanged: z.boolean().optional(), any_card: z.boolean().optional() })
      .strict()
      .optional(),
    /** Ca an toàn TIP-045b (hardening-judge.ts): chấm theo loại ca của `hardening` — canary trường thu hồi, thẻ hàng loạt, người tiếp quản, OTP Owner. */
    hardening: z.literal(true).optional(),
    /** Ca dọc kênh Zalo TIP-014b AC9 (channel-judge.ts): chấm theo loại ca của `channel`. */
    channel: z.literal(true).optional(),
    /** Ca AI Marketing TIP-037 (marketing-judge.ts): chấm theo loại ca của `marketing`. */
    marketing: z.literal(true).optional(),
    /** Ca số liệu TIP-038 (insights-judge.ts): chấm theo loại ca của `insights` — số / tên khớp `GET /insights/:metric` cùng tham số. */
    insights: z.literal(true).optional(),
    /** Ca nhập / xuất dữ liệu TIP-038b (transfer-judge.ts): chấm theo DB — kế hoạch completed + bản ghi thật / việc xuất thật. */
    transfer: z.literal(true).optional(),
    /** Ca toàn vẹn runtime TIP-019b AC10 (runtime-judge.ts): chấm theo trạng thái run thật (`GET /runs/:id`) + credit cây. */
    runtime: z.literal(true).optional(),
    /** Ca hoạt động CRM TIP-026b (activity-judge.ts): chấm theo hoạt động thật của khách / kế hoạch nhập / việc xuất. */
    activity: z.literal(true).optional(),
    /** Ca chuyển phụ trách TIP-015d (ctransfer-judge.ts): chấm theo yêu cầu duyệt / người phụ trách / báo giá thật. */
    ctransfer: z.literal(true).optional(),
    /** Ca sửa đơn / hợp đồng TIP-032c (cedit-judge.ts): chấm theo người tạo / người phụ trách / phiên bản / tệp xuất thật. */
    cedit: z.literal(true).optional(),
    /** Ca vòng đời khách TIP-015f (lifecycle-judge.ts): chấm theo thùng rác / khách sống / đơn sàn / tệp xuất thật. */
    lifecycle: z.literal(true).optional(),
    /** Ca gộp khách TIP-015e (merge-judge.ts): chấm theo khách sống / đơn theo họ / tệp xuất thật. */
    merge: z.literal(true).optional(),
    /** Ca mail của DN TIP-012c (tenant-mail-judge.ts): chấm theo chiến dịch / biên nhận / lượt gọi provider / tệp xuất thật. */
    tenant_mail: z.literal(true).optional(),
    /** Ca lịch hẹn + liệu trình TIP-033b (booking-judge.ts): chấm theo lịch / cấu hình / agent / tệp xuất / số buổi thật. */
    booking: z.literal(true).optional(),
    /** Ca kỹ năng tiện ích AI TIP-019c AC8 (utility-judge.ts): chấm theo `GET /ai-utilities/:runId/result` thật — không qua Trợ lý. */
    ai_utility: z.literal(true).optional(),
    /** Ca đầu vào tệp TIP-023f (input-judge.ts): sự kiện canary trong nội dung tệp phải có trong câu trả lời + không ghi chưa xác nhận. */
    input_file: z.literal(true).optional(),
    /** Ca giữ giai đoạn kéo tay TIP-015g (stage-judge.ts): chấm theo giai đoạn / lịch sử / hoàn tác đọc lại từ API. */
    stage_hold: z.literal(true).optional(),
    /** Ca soạn agent TIP-021b (agent-draft-judge.ts): gọi thẳng action, chấm tool theo ứng viên của binding + quyền thật. */
    agent_draft: z.literal(true).optional(),
    /** Ca lối vào theo bản ghi TIP-023g (record-judge.ts): chấm getter / binding đề xuất / 404 theo API thật. */
    record: z.literal(true).optional(),
    /** Ca phạm vi tri thức TIP-020c (kb-scope-judge.ts): chấm theo mã canary của nguồn seed (có / không có trong câu trả lời). */
    kb_scope: z.literal(true).optional(),
    /** Ca trích dẫn câu trả lời TIP-020d (citation-judge.ts): chấm binding trích dẫn của run + câu gửi khách đọc lại từ API. */
    citation: z.literal(true).optional(),
    /** Ca kế hoạch Cowork TIP-023d (plans-judge.ts): chấm theo kế hoạch / run con / duyệt / bản ghi đọc lại từ API. */
    plan: z.literal(true).optional(),
    /** Ca gợi ý tạo đơn từ lịch hẹn TIP-033c (appointment-order-judge.ts): chấm theo liên kết lịch ↔ đơn + tổng đơn thật. */
    appointment_order: z.literal(true).optional(),
    /** Ca tệp đính kèm đơn / đề nghị TIP-032d (record-files-judge.ts): chấm theo danh sách tệp của bản ghi đọc lại từ API. */
    record_files: z.literal(true).optional(),
    product_media: z.literal(true).optional(),
  })
  .strict()
  .refine((e) => e.ask_back || e.action || e.action_any || e.sequence || e.ui || e.draft || e.contract || e.memory || e.loyalty || e.hardening || e.channel || e.marketing || e.insights || e.transfer || e.runtime || e.activity || e.ctransfer || e.cedit || e.lifecycle || e.merge || e.tenant_mail || e.booking || e.ai_utility || e.input_file || e.stage_hold || e.agent_draft || e.record || e.kb_scope || e.citation || e.plan || e.appointment_order || e.record_files || e.product_media, { message: 'action_or_sequence_or_ask_back' })
  .refine((e) => !(e.action && e.action_any), { message: 'action_xor_action_any' });

export const caseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{3,40}$/),
    category: z.enum(CATEGORIES),
    seed: z.literal('live-seed'),
    actor: z.object({ role: z.enum(['owner']) }).strict(),
    locale: z.enum(['vi', 'en']),
    mode: z.enum(['chat', 'cowork']).default('cowork'),
    input: z.string().trim().min(1).max(1000),
    /** Ngữ cảnh màn (drawer theo màn — TIP-023c G2): entity + id seed (`$seed.<…>`), route, surface. */
    context: z.object({ route: z.string().max(100), entity: z.string().max(40).optional(), id: z.string().max(120).optional(), surface: z.enum(['drawer', 'assistant']).default('drawer') }).strict().optional(),
    /** Ca nháp Hộp thư: purpose gửi kèm hội thoại seed. */
    draft: z.object({ purpose: z.enum(['inbox_compose', 'inbox_rewrite']), conversation: z.string().max(120) }).strict().optional(),
    /** Ca AI soạn hợp đồng: gọi thẳng contract.prepare_draft → draft_from_content (model thật, không qua Trợ lý); khách `$seed.<…>`. */
    contract: z.object({ contact: z.string().max(120), kind: z.enum(['service', 'sale', 'framework']).default('service') }).strict().optional(),
    /** Ca trí nhớ khách: khách `$seed.<…>` để đọc `GET /contacts/:id/memory`; `prime` = lượt ghi trước lượt chính (phiên riêng). */
    memory: z.object({ contact: z.string().max(120), prime: z.string().trim().min(1).max(1000).optional() }).strict().optional(),
    /** Ca khách thân thiết: khách + đề nghị thanh toán `$seed.<…>` (loyalty-seed.mjs) để đọc số dư / số đã thu trước và sau lượt. */
    loyalty: z.object({ contact: z.string().max(120), invoice: z.string().max(120).optional() }).strict().optional(),
    /** Ca an toàn TIP-045b: loại ca + hội thoại `$seed.<…>` (ca người tiếp quản) — hardening-seed.mjs. */
    hardening: z.object({ kind: z.enum(['hidden', 'export', 'bulk', 'takeover', 'owner_otp']), conversation: z.string().max(120).optional() }).strict().optional(),
    /** Ca dọc kênh Zalo TIP-014b AC9: loại ca — channel-seed.mjs (khách Zalo mới, tin unknown, tài khoản đã ngắt, Sales scope own). */
    channel: z.object({ kind: z.enum(['new_customer', 'unknown', 'no_resend', 'revoked', 'disconnected']) }).strict().optional(),
    /** Ca AI Marketing TIP-037: loại ca — marketing-seed.mjs (Zalo giả, chiến dịch Chờ duyệt, Sales không quyền chiến dịch). */
    marketing: z.object({ kind: z.enum(['analyze', 'tone', 'variables', 'no_auto', 'revoked']) }).strict().optional(),
    /** Ca số liệu TIP-038: loại ca — insights-seed.mjs (đơn + khoản thu của Owner trong tháng, Sales scope own). */
    insights: z.object({ kind: z.enum(['owner_money', 'sales_scope', 'at_risk']) }).strict().optional(),
    /** Ca toàn vẹn runtime TIP-019b AC10: loại ca + tiện ích phải thấy (`utility`) — runtime-seed.mjs (agent Sales gửi báo giá cần duyệt, agent CSKH tra cứu). */
    runtime: z.object({ kind: z.enum(['approval_resume', 'cancel_parent', 'delegate_pair', 'utility', 'export', 'refuse']), tool: z.string().max(120).optional() }).strict().optional(),
    /** Ca hoạt động CRM TIP-026b: loại ca + action người chấm xác nhận + chuỗi phải có (`$TAG` = khoá lượt) + tập nhập / action xuất. */
    activity: z
      .object({
        kind: z.enum(['note', 'task', 'quote_form', 'refuse', 'hidden', 'import', 'export']),
        accept: z.array(z.string().regex(/^[a-z_]+\.[a-z0-9_.]+$/)).max(6).optional(),
        needle: z.string().max(120).optional(),
        dataset: z.enum(['contact_notes', 'contact_tasks', 'contact_opportunities']).optional(),
        export: z.enum(['contact_note.export', 'contact_task.export', 'contact_opportunity.export']).optional(),
      })
      .strict()
      .optional(),
    /** Ca chuyển phụ trách TIP-015d: loại ca (ctransfer-judge.ts) — khách theo khoá lượt từ contact-transfer/seed.mjs. */
    ctransfer: z.object({ kind: z.enum(['approval', 'approve', 'attribution', 'bulk', 'status', 'refuse', 'no_bypass', 'undo_truth']) }).strict().optional(),
    /** Ca vòng đời khách TIP-015f: loại ca (lifecycle-judge.ts) — bộ theo khoá lượt từ contact-lifecycle/seed.mjs. */
    lifecycle: z.object({ kind: z.enum(['blocked', 'allowed', 'expired', 'conflict', 'denied', 'inbound', 'external', 'export']) }).strict().optional(),
    /** Ca gộp khách TIP-015e: loại ca (merge-judge.ts) — bộ theo khoá lượt từ contact-merge/seed.mjs. */
    merge: z.object({ kind: z.enum(['candidates', 'explain', 'selected', 'acl', 'stale', 'undo', 'history', 'file']) }).strict().optional(),
    /** Ca mail của DN TIP-012c: loại ca (tenant-mail-judge.ts) — bộ theo khoá lượt từ tenant-mail/seed.mjs. */
    tenant_mail: z.object({ kind: z.enum(['secret', 'probe', 'approval', 'rotation', 'unknown', 'evidence', 'file', 'manual']) }).strict().optional(),
    /** Ca lịch hẹn + liệu trình TIP-033b: loại ca (booking-judge.ts) — bộ theo khoá lượt từ booking-operations/seed.mjs. */
    booking: z.object({ kind: z.enum(['entitlement', 'expired', 'conflict', 'exhausted', 'hours', 'agent', 'export', 'import']) }).strict().optional(),
    /** Ca gợi ý tạo đơn từ lịch hẹn TIP-033c: loại ca (appointment-order-judge.ts) — bộ theo khoá lượt từ appointment-order-seed.mjs. */
    appointment_order: z.object({ kind: z.enum(['eligible', 'package', 'linked', 'limited', 'changed', 'selected']) }).strict().optional(),
    /** Ca tệp đính kèm đơn / đề nghị TIP-032d: loại ca (record-files-judge.ts) — bộ theo khoá lượt từ commerce-files-seed.mjs. */
    record_files: z.object({ kind: z.enum(['attach_order', 'attach_invoice', 'detach', 'missing', 'forbidden', 'duplicate', 'retained', 'wrong_record']) }).strict().optional(),
    /** Ca ảnh / mô tả sản phẩm TIP-027b: loại ca (product-media-judge.ts) — bộ theo khoá lượt từ product-media-seed.mjs. */
    product_media: z.object({ kind: z.enum(['formatted', 'attach', 'unresolved', 'restricted', 'retained', 'malformed']) }).strict().optional(),
    /** Ca sửa đơn / hợp đồng TIP-032c: loại ca (cedit-judge.ts) — bộ theo khoá lượt từ commerce-edit-integrity/seed.mjs. */
    cedit: z.object({ kind: z.enum(['assign', 'owner', 'marketplace', 'concurrent', 'deposit', 'shipping', 'transfer', 'export']) }).strict().optional(),
    /** Ca kỹ năng tiện ích AI TIP-019c AC8: loại ca (utility-judge.ts) + id seed khi cần (hội thoại / tin / khách). */
    utility: z
      .object({
        kind: z.enum(['summarize_vi', 'summarize_en', 'intent_ambiguous', 'extract_missing', 'lead_insufficient', 'lead_explicit', 'invalid_scope', 'injection']),
        conversation: z.string().max(120).optional(),
        message: z.string().max(120).optional(),
        contact: z.string().max(120).optional(),
      })
      .strict()
      .optional(),
    /** Ca nhập / xuất TIP-038b: thực thể + tệp seed (data-transfer-seed.mjs — khoá theo thực thể khi bỏ trống). */
    transfer: z
      .object({ kind: z.enum(['import', 'export']), entity: z.enum(['contact', 'product', 'quote', 'order', 'contract', 'invoice']), file: z.enum(['contacts', 'products', 'quotes', 'orders', 'contracts', 'invoices']).optional() })
      .strict()
      .optional(),
    /** Ca giữ giai đoạn kéo tay TIP-015g: loại ca (stage-judge.ts) — khách theo khoá lượt từ crm-stage-hold/seed.mjs. */
    stage_hold: z.object({ kind: z.enum(['move_order', 'noop', 'revoked', 'undo']) }).strict().optional(),
    /** Ca soạn agent TIP-021b: `allowed` (Owner — tool cần có / một trong / cấm) · `limited` (Sales thật — không quyền action → không cấp). */
    agent_draft: z
      .object({ kind: z.enum(['allowed', 'limited']), want: z.array(z.string().max(60)).max(6).optional(), any: z.array(z.string().max(60)).max(6).optional(), forbid: z.array(z.string().max(60)).max(6).optional() })
      .strict()
      .optional(),
    /** Ca lối vào theo bản ghi TIP-023g: `inspect` (lượt theo bản ghi seed) · `proposal` (đề xuất combo / chiến dịch) · `limited` (Sales ngoài scope → 404). */
    record: z
      .object({
        kind: z.enum(['inspect', 'proposal', 'limited']),
        entity: z.enum(['quote', 'contract', 'order', 'appointment', 'follow_up', 'ticket', 'invoice', 'product']),
        intent: z.enum(['inspect', 'review_ticket', 'invoice_task', 'product_combo', 'product_campaign']).default('inspect'),
      })
      .strict()
      .optional(),
    /** Ca phạm vi tri thức TIP-020c: đường chạy + agent seed + mã nguồn phải có (`want`) / không được có (`deny`) / không mã nào (`none`). */
    kb_scope: z
      .object({
        path: z.enum(['assistant', 'builder', 'nested', 'revoked']),
        agent: z.enum(['empty', 'folder', 'tag', 'mixed', 'internal']).optional(),
        channel: z.boolean().optional(),
        as_sales: z.boolean().optional(),
        want: z.array(z.enum(['fa', 'fb', 'tag', 'int', 'pub', 'out'])).max(6).optional(),
        deny: z.array(z.enum(['fa', 'fb', 'tag', 'int', 'pub', 'out'])).max(6).optional(),
        none: z.boolean().optional(),
        revoke: z.enum(['fa', 'fb', 'tag', 'int', 'pub', 'out']).optional(),
      })
      .strict()
      .optional(),
    /** Ca trích dẫn TIP-020d: đường chạy (lượt agent kênh thật) + mã nguồn phải có (`want`) / không được có (`deny`). */
    citation: z
      .object({
        path: z.enum(['grounded', 'none', 'copilot', 'handoff', 'revoked']),
        want: z.array(z.enum(['gio', 'gia', 'bh', 'noibo'])).max(4).optional(),
        deny: z.array(z.enum(['gio', 'gia', 'bh', 'noibo'])).max(4).optional(),
        /** Câu hỏi có phần ngoài tài liệu: chuyển người kèm nháp có nguồn đã kiểm cũng đạt (không gửi khách). */
        handoff_ok: z.boolean().optional(),
      })
      .strict()
      .optional(),
    /** Ca đầu vào tệp TIP-023f: khoá tệp seed (assistant-input-seed.mjs — tải lên + chuẩn bị mỗi lượt). */
    input_file: z.object({ file: z.enum(['pdf_vi', 'docx_en', 'image', 'screenshot', 'eml', 'csv', 'injection']) }).strict().optional(),
    /** Ca kế hoạch Cowork TIP-023d: loại ca + agent seed được chọn (assistant-plans-seed.mjs — hai agent trùng tên) + số bước tối thiểu. */
    plan: z.object({ kind: z.enum(['propose', 'selected', 'chat_write', 'pause_edit', 'approval', 'reuse', 'file']), agent: z.enum(['crm', 'sales']).optional(), min_steps: z.number().int().min(1).max(12).optional() }).strict().optional(),
    expect: expectSchema,
  })
  .strict();

export const suiteSchema = z
  .object({ suite: z.string().regex(/^[a-z0-9-]{2,40}$/), cases: z.array(caseSchema).min(1).max(200) })
  .strict()
  .superRefine((s, ctx) => {
    const seen = new Set<string>();
    for (const [i, c] of s.cases.entries()) {
      if (seen.has(c.id)) ctx.addIssue({ code: 'custom', path: ['cases', i, 'id'], message: 'duplicate_id' });
      seen.add(c.id);
    }
  });

export type LiveCase = z.infer<typeof caseSchema>;
export type Suite = z.infer<typeof suiteSchema>;

export class CasesError extends Error {}

/** Đường dẫn ca: tương đối gốc repo, phải nằm trong repo (kể cả sau symlink), ≤ 256 KB, đuôi .json / .yaml / .yml. */
export function resolveCasesPath(p: string, root = REPO_ROOT): string {
  if (isAbsolute(p)) throw new CasesError('cases_path_must_be_repo_relative');
  const abs = resolve(root, p);
  const inside = (x: string) => {
    const r = relative(root, x);
    return !!r && !r.startsWith('..') && !isAbsolute(r);
  };
  if (!inside(abs)) throw new CasesError('cases_path_outside_repo');
  let real: string;
  try {
    real = realpathSync(abs);
  } catch {
    throw new CasesError('cases_file_not_found');
  }
  if (!inside(real)) throw new CasesError('cases_path_outside_repo');
  if (!/\.(json|ya?ml)$/i.test(real)) throw new CasesError('cases_file_type');
  if (statSync(real).size > MAX_BYTES) throw new CasesError('cases_file_too_large');
  return real;
}

/** Parse JSON / YAML (không alias, không nhiều tài liệu) → zod chặt. Lỗi → CasesError (CLI thoát ≠ 0). */
export function parseSuite(text: string, kind: 'json' | 'yaml'): Suite {
  if (!text.trim()) throw new CasesError('cases_file_empty');
  let raw: unknown;
  try {
    raw = kind === 'json' ? JSON.parse(text) : parse(text, { maxAliasCount: 0, uniqueKeys: true, prettyErrors: false });
  } catch (e) {
    throw new CasesError(`cases_parse_failed: ${(e as Error).message.slice(0, 200)}`);
  }
  const r = suiteSchema.safeParse(raw);
  if (!r.success) throw new CasesError(`cases_schema_invalid: ${r.error.issues.slice(0, 5).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
  return r.data;
}

export function loadSuite(path: string): Suite {
  return parseSuite(readFileSync(path, 'utf8'), /\.json$/i.test(path) ? 'json' : 'yaml');
}

/** Bộ mặc định: đúng 30 ca, đúng phân bổ — lệch là lỗi (không được thay ca lúc nghiệm thu — eval.md). */
export function loadDefault(): Suite {
  const s = loadSuite(DEFAULT_CASES);
  if (s.cases.length !== DEFAULT_COUNT) throw new CasesError(`default_suite_must_have_${DEFAULT_COUNT}_cases`);
  for (const c of CATEGORIES) {
    const n = s.cases.filter((x) => x.category === c).length;
    if (n !== DEFAULT_MIX[c]) throw new CasesError(`default_suite_mix_${c}_${n}_expected_${DEFAULT_MIX[c]}`);
  }
  return s;
}

/** Chọn suite theo tham số CLI: `--cases <path>` → đúng file đó; không truyền → bộ mặc định. `--only id,id` lọc, id lạ → lỗi. */
export function selectSuite(args: { cases?: string; only?: string[] }): Suite {
  const s = args.cases ? loadSuite(resolveCasesPath(args.cases)) : loadDefault();
  if (!args.only?.length) return s;
  const ids = new Set(s.cases.map((c) => c.id));
  const unknown = args.only.filter((id) => !ids.has(id));
  if (unknown.length) throw new CasesError(`unknown_case: ${unknown.join(',')}`);
  return { ...s, cases: s.cases.filter((c) => args.only!.includes(c.id)) };
}
