// TIP-023b R1.3 — chặn hồi quy phủ Trợ lý (chạy trong cổng trước commit của mọi TIP sau):
//   1. mỗi ô `<thực thể>_id` của action có handler thật có đường tra (mã → id ở code-refs, hoặc action đọc `<thực thể>.search|get|list`);
//   2. mỗi action ghi có handler thật có `preview()` — danh sách nợ chỉ được giảm (R2 xong = rỗng);
//   3. mỗi màn danh sách (route GET ở apps/api) có action đọc tương ứng.
// Nợ là danh sách đóng: thêm action / ô mới mà thiếu đường tra / preview → đỏ; trả nợ mà quên xoá khỏi danh sách → đỏ.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import type { JsonSchema } from '@appchat/ai';
import { CODE_REF_ENTITIES } from '../src/ai/assistant/code-refs';
import { SYSTEM_ONLY } from '../src/ai/assistant/catalog';
import { inputSchemaOf } from '../src/ai/runs/tools';
import { PREVIEW_DEBT } from './assistant-coverage.debt';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.ts') ? [join(d, f)] : []));

/** Handler thật trong source (`@ActionHandler('id')`) + có `preview(` trong thân lớp — quét tĩnh, không cần boot Nest. */
function handlers(): Map<string, { preview: boolean }> {
  const out = new Map<string, { preview: boolean }>();
  for (const f of walk(join(__dirname, '../src'))) {
    for (const part of readFileSync(f, 'utf8').split("@ActionHandler('").slice(1)) {
      const id = part.slice(0, part.indexOf("'"));
      if (id) out.set(id, { preview: /\basync\s+preview\s*\(\s*_?ctx\b/.test(part) });
    }
  }
  return out;
}

const H = handlers();
// Callback system-only (worker) không đi qua Trợ lý / UI; action quản trị nền tảng chỉ chạy từ màn /admin (DC-368) — ngoài phạm vi phủ.
const DEFS = registry.filter((a) => H.has(a.id) && !SYSTEM_ONLY.has(a.id) && a.permission !== 'platform_admin');
const IMPLEMENTED = new Set(DEFS.map((a) => a.id));

/** Đường dẫn mọi ô `*_id` / `id` trong input (lồng object / array / anyOf). */
function idFields(s: JsonSchema, path = ''): string[] {
  const o = s as { properties?: Record<string, JsonSchema>; items?: JsonSchema; anyOf?: JsonSchema[] };
  const out: string[] = [];
  for (const [k, v] of Object.entries(o.properties ?? {})) {
    if (k === 'id' || k.endsWith('_id')) out.push(`${path}${k}`);
    out.push(...idFields(v, `${path}${k}.`));
  }
  if (o.items) out.push(...idFields(o.items, `${path}[].`));
  for (const x of o.anyOf ?? []) out.push(...idFields(x, path));
  return out;
}

/** Tên ô → thực thể tra (ô người / agent / mẫu không mang tên thực thể). */
const ALIAS: Record<string, string> = {
  owner_user_id: 'member',
  assigned_user_id: 'member',
  assignee_user_id: 'member',
  to_user_id: 'member',
  user_id: 'member',
  lead_user_id: 'member',
  fixed_user_id: 'member',
  owner_id: 'member',
  assignee_agent_id: 'agent',
  reply_id: 'canned_reply',
  layout_id: 'profile_layout',
  source_id: 'kb_source',
  task_id: 'ai_task',
  target_conversation_id: 'conversation',
  account_id: 'channel_account',
  connection_id: 'integration',
  // TIP-026b: hội thoại nguồn của hoạt động CRM tra như hội thoại; hoạt động / cơ hội tra qua contact_activity.list.
  source_conversation_id: 'conversation',
  activity_id: 'contact_activity',
  opportunity_id: 'contact_activity',
};

/** Ô id người dùng không nói ra / không phải tham chiếu thực thể — miễn trừ, kèm lý do. */
const EXEMPT: Record<string, string> = {
  approval_id: 'duyệt mở từ hàng chờ duyệt / thông báo, không gọi theo tên',
  bank_tx_id: 'giao dịch ngân hàng chọn trong màn đối soát, không có mã người dùng nói',
  invite_id: 'lời mời chọn ở Cài đặt › Thành viên',
  message_id: 'tin cụ thể — model lấy từ conversation.get, người dùng không đọc id tin',
  reply_to_id: 'tin được trả lời — cùng lý do message_id',
  source_message_id: 'tin nguồn của ticket — cùng lý do message_id',
  request_id: 'yêu cầu truy cập mở từ thông báo',
  payment_id: 'yêu cầu hoàn tiền mở từ hàng chờ duyệt',
  file_id: 'tệp vừa tải lên trong lượt (đính kèm), không tra theo tên',
  folder_id: 'thư mục KB chọn trong màn KB',
  parent_id: 'thư mục KB cha — chọn trong drawer Sửa thư mục của màn KB (TIP-020b), cùng lý do folder_id',
  national_id: 'số CCCD / MST — giá trị, không phải tham chiếu thực thể',
  workspace_id: 'workspace của chính người dùng (danh sách ở session)',
  exclude_id: 'lịch hẹn đang dời (đã có trong ngữ cảnh lượt)',
  template_id: 'mẫu agent / mẫu tài liệu — danh mục cố định trả trong meta của màn',
  rule_id: 'rule chia lead (TIP-042b) — một rule mặc định + một mỗi tài khoản kênh, chọn ở Cài đặt › Chia lead; lead_routing.update chỉ người bấm (agentGrantable false)',
  team_id: 'nhóm chọn ở Cài đặt › Nhóm (TIP-042); team.* chỉ người bấm (agentGrantable false), Trợ lý không gọi',
  operation_id: 'lệnh thu hồi / cảm xúc trên tin (TIP-014b) — handle job_accepted của message.recall / message.react cùng lượt, không có mã người dùng nói',
  job_id: 'việc dữ liệu nặng (TIP-045b) — handle job_accepted của contact.export / contact.bulk_update cùng lượt, không có mã người dùng nói',
  import_id: 'lần nhập sản phẩm — handle job_accepted / kết quả product.import cùng lượt, không có mã người dùng nói',
  transfer_id: 'lần chuyển phụ trách (TIP-015d) — handle `transfer_id` trong kết quả contact.transfer_owner cùng lượt / sau duyệt, không có mã người dùng nói',
  plan_id: 'kế hoạch nhập dữ liệu (TIP-038b) — handle kết quả transfer.plan cùng lượt / thẻ nhập trên màn, sống 24h, không có mã người dùng nói',
  proposal_id: 'đề xuất soạn HĐ — lấy từ kết quả contract.prepare_draft cùng lượt, sống 24h, không có mã người dùng nói',
  suggestion_id: 'gợi ý điều khoản AI — đọc từ ai_suggestions của contract.get',
  segment_id: 'phân khúc (TIP-037) — chọn trong wizard / màn Marketing (danh sách ở campaigns/meta), không có mã người dùng nói; segment.* chỉ người bấm',
  audience_batch_id: 'lô nhập danh sách — handle kết quả campaign.audience_import cùng lượt, không có mã người dùng nói',
  follow_up_id: 'việc follow (TIP-038) — chọn trên Tổng quan / Lịch hẹn (dòng có nút Đã follow), không có mã người dùng nói',
  external_id: 'id người dùng phía kênh (TIP-014b E bạn bè Zalo) — chọn từ lời mời tới / hội thoại / kết quả tra SĐT trên màn; action chỉ nhân viên bấm, Trợ lý không gọi',
  assignee_id: 'đồng phụ trách hội thoại (người hoặc AI Agent, ô dùng chung cho cả 2 loại) — chọn trong menu ⋯ Hộp thư; conversation.add_assignee / remove_assignee chỉ nhân viên bấm (agentGrantable false), Trợ lý không gọi',
  session_id: 'phiên Trợ lý hiện hành (TIP-023d assistant.plan_propose) — đã có sẵn trong ngữ cảnh lượt (ownSession), người dùng không đọc/nói id phiên',
  action_or_agent_id: 'bước kế hoạch Cowork (TIP-023d assistant.plan_propose) — action id lấy từ find_actions hoặc agent id lấy từ agent.search trong cùng lượt, không phải mã người dùng nói ra',
};

/** Nợ đường tra (R2 thêm action đọc) — chỉ được giảm. */
const LOOKUP_DEBT = new Set<string>([]);

/** Màn danh sách (route GET apps/api) → action đọc tương ứng. */
const SCREENS: Record<string, string> = {
  contacts: 'contact.search',
  quotes: 'quote.search',
  contracts: 'contract.search',
  orders: 'order.search',
  invoices: 'invoice.search',
  tickets: 'ticket.search',
  calendar: 'appointment.list',
  products: 'product.search',
  conversations: 'conversation.search',
  agents: 'agent.search',
  'settings/members': 'member.search',
  tags: 'tag.search',
  'doc-templates': 'doc_template.search',
  'settings/channels': 'channel.search',
  runs: 'run.search',
  'settings/kb': 'kb.source_search',
};
/** Nợ màn (R2) — chỉ được giảm. */
const SCREEN_DEBT = new Set<string>([]);

/** Thực thể mà action đọc mang tên khác (tài khoản kênh tra bằng `channel.search`, nguồn KB bằng `kb.source_search`, phụ lục qua `contract.get`, biến thể qua `product.get`, trí nhớ khách qua `contact.memory_list`). */
const READ_ALIAS: Record<string, string> = { channel_account: 'channel.search', kb_source: 'kb.source_search', appendix: 'contract.get', variant: 'product.get', memory: 'contact.memory_list', contact_activity: 'contact_activity.list', item: 'contact.privacy_status' };
const hasRead = (entity: string) => (READ_ALIAS[entity] ? IMPLEMENTED.has(READ_ALIAS[entity]!) : ['search', 'get', 'list'].some((v) => IMPLEMENTED.has(`${entity}.${v}`)));
const hasPath = (entity: string) => CODE_REF_ENTITIES.includes(entity) || hasRead(entity);

describe('phủ Trợ lý — ô id có đường tra', () => {
  const entities = new Map<string, string[]>();
  for (const d of DEFS) {
    for (const f of idFields(inputSchemaOf(d))) {
      const leaf = f.split('.').pop()!;
      const name = leaf === 'id' ? `${d.id.split('.')[0]}_id` : leaf;
      if (EXEMPT[name]) continue;
      const e = ALIAS[name] ?? name.slice(0, -3);
      entities.set(e, [...(entities.get(e) ?? []), `${d.id}:${f}`]);
    }
  }

  it('mọi thực thể có mã → id hoặc action đọc, trừ nợ R2', () => {
    const missing = [...entities.keys()].filter((e) => !hasPath(e) && !LOOKUP_DEBT.has(e)).map((e) => `${e} ← ${entities.get(e)!.join(', ')}`);
    expect(missing).toEqual([]);
  });

  it('nợ đường tra không chứa thực thể đã có đường tra / không còn dùng (xoá khỏi danh sách)', () => {
    expect([...LOOKUP_DEBT].filter((e) => hasPath(e) || !entities.has(e))).toEqual([]);
  });
});

describe('phủ Trợ lý — action ghi có preview', () => {
  const writes = DEFS.filter((d) => d.risk !== 'read');

  it('action ghi thiếu preview đều nằm trong danh sách nợ', () => {
    expect(writes.filter((d) => !H.get(d.id)!.preview && !PREVIEW_DEBT.has(d.id)).map((d) => d.id)).toEqual([]);
  });

  it('nợ preview không chứa action đã có preview / không còn handler', () => {
    expect([...PREVIEW_DEBT].filter((id) => !IMPLEMENTED.has(id) || H.get(id)!.preview)).toEqual([]);
  });
});

describe('phủ Trợ lý — màn danh sách có action đọc', () => {
  const routes = new Set<string>();
  for (const f of walk(join(__dirname, '../../../apps/api/src/http'))) {
    const s = readFileSync(f, 'utf8');
    const base = /@Controller\('([^']*)'\)/.exec(s)?.[1] ?? '';
    for (const m of s.matchAll(/@Get\((?:'([^']*)')?\)/g)) routes.add([base, m[1] ?? ''].filter(Boolean).join('/'));
  }

  it('mỗi màn trong bảng có route GET thật ở apps/api', () => {
    expect(Object.keys(SCREENS).filter((r) => !routes.has(r))).toEqual([]);
  });

  it('màn có action đọc (đã khai + có handler), trừ nợ R2', () => {
    expect(Object.entries(SCREENS).filter(([r, a]) => !IMPLEMENTED.has(a) && !SCREEN_DEBT.has(r)).map(([r, a]) => `${r} → ${a}`)).toEqual([]);
  });

  it('nợ màn không chứa màn đã có action đọc', () => {
    expect([...SCREEN_DEBT].filter((r) => IMPLEMENTED.has(SCREENS[r]!))).toEqual([]);
  });
});
