// Danh mục action cho Trợ lý (Blueprint §5.2 `find_actions`): action trong quyền người dùng, lọc theo chế độ (Chat chỉ `read`),
// tìm không dấu theo từ khoá trên id / module / mô tả (en) / tên đối tượng + module (vi) — bản đầu không dùng embedding (DC-129).
// Trả id + mô tả + khuôn input lồng nhau (schema-brief.ts) để model gọi `call_action` đúng. Chỉ action đã có handler thật (TIP-023b R1.2):
// action còn NOT_IMPLEMENTED không lộ ra — gọi vào chỉ nhận 501.
import { registry, type ActionDef } from '@appchat/actions';
import { can, foldText, serverMessages, type AuthzContext, type PermissionKey } from '@appchat/shared';
import { inputSchemaOf } from '../runs/tools';
import { exampleOf, schemaBrief, type Brief } from './schema-brief';

export type AssistantMode = 'chat' | 'cowork';
export const FIND_LIMIT = 8;

/**
 * Action Trợ lý không bao giờ gọi: quản trị nền tảng, chuyển workspace, đổi Chủ sở hữu (OTP chỉ ở UI — TIP-045b A3), quyết định duyệt
 * thay người, xác nhận chuyển khoản gói.
 */
const HIDDEN = /^(admin\.|workspace\.(switch|request_transfer_otp|transfer_ownership)$|approval\.|billing\.)/;

/**
 * Callback chỉ nguồn system (worker) — không ai gọi bằng lời / UI nên không cần preview hay đường tra id. Trang ký công khai phụ lục
 * (TIP-030b F3): chỉ bộ chuyển token gọi với capability niêm phong — ẩn khỏi mọi khám phá; handler vẫn từ chối khi thiếu capability.
 * Sổ điểm theo sự kiện / lịch (TIP-036 — loyalty.earn / reverse / expire / review_tier): chỉ consumer + job loyalty gọi.
 * Mở workspace (TIP-041 — workspace.open): chỉ cổng FE gọi qua nhánh vòng đời; executor thường từ chối.
 */
export const SYSTEM_ONLY = new Set(['channel.group_result', 'assistant.resume', 'contract.appendix_public_otp', 'contract.appendix_public_sign', 'contract.appendix_public_decline', 'loyalty.earn', 'loyalty.reverse', 'loyalty.expire', 'loyalty.review_tier', 'kb.suggestion.propose', 'lead_routing.apply', 'bank_feed.ingest', 'campaign.dispatch', 'campaign.record_delivery', 'campaign.record_metric', 'campaign.store_analysis', 'campaign.unsubscribe', 'follow_up.reconcile', 'digest.dispatch', 'billing.lifecycle_step', 'billing.apply_invoice', 'workspace.open', 'workspace.delete_challenge', 'workspace.delete', 'workspace.freeze_request']);

export const entityOf = (actionId: string) => actionId.split('.')[0]!;

/** Người dùng gọi được (quyền + Owner); `self` luôn được, `platform_admin` không qua Trợ lý. */
export function allowedFor(a: ActionDef, authz: AuthzContext): boolean {
  if (HIDDEN.test(a.id) || SYSTEM_ONLY.has(a.id) || a.permission === 'platform_admin') return false;
  return a.permission === 'self' || can(authz, a.permission as PermissionKey);
}

export const modeAllows = (a: Pick<ActionDef, 'risk'>, mode: AssistantMode) => mode === 'cowork' || a.risk === 'read';

/** Động từ tiếng Việt (không dấu) của phần sau dấu chấm trong id — "tạo khách hàng" khớp `contact.create`. */
const VERB_VI: Record<string, string> = {
  create: 'tao them moi lap', update: 'sua cap nhat doi chinh', delete: 'xoa', search: 'tim tra cuu loc danh sach liet ke', get: 'xem chi tiet tra cuu',
  list: 'danh sach liet ke xem', send: 'gui', cancel: 'huy', approve: 'duyet', reject: 'tu choi', pause: 'tam dung', resume: 'tiep tuc chay lai',
  assign: 'giao phan cong', archive: 'luu tru ngung ban ngung su dung an', complete: 'hoan tat xong', confirm: 'xac nhan', comment: 'binh luan ghi chu', tag: 'gan the nhan',
  set_stage: 'chuyen giai doan doi giai doan', set_status: 'doi trang thai', submit: 'gui duyet trinh duyet', test: 'thu kiem tra', connect: 'ket noi',
  disconnect: 'ngat ket noi', merge: 'gop', import: 'nhap', export: 'xuat', adjust: 'dieu chinh', find_slots: 'gio trong lich trong tim gio',
  close: 'dong', reopen: 'mo lai', extend: 'gia han keo dai', void: 'huy bo', reschedule: 'doi lich doi gio', record: 'ghi nhan thu tien', refund: 'hoan tien',
  remember: 'ghi nho nho luu lai luu y', memory_list: 'ghi nho tri nho da nho', memory_forget: 'quen xoa ghi nho', summarize: 'tom tat',
  redeem: 'doi diem tru diem dung diem quy doi diem thanh toan bang diem', get_member: 'xem diem hang thanh vien so diem quy doi',
  // TIP-025b: dịch tin / bản nháp, thẻ duyệt theo hội thoại, sửa hàng loạt hội thoại, xuất lịch sử khách.
  translate: 'dich dich sang tieng ngon ngu dich tin nhan ban dich tieng anh tieng trung tieng han tieng nhat', approvals: 'duyet cho duyet yeu cau duyet the duyet', bulk_update: 'hang loat nhieu cung luc gan the giao trang thai',
  history_export: 'xuat lich su tuong tac csv',
  // TIP-026b: ghi chú / bình luận nội bộ trên khách (không phải sửa trường khách, không gửi tin).
  add_note: 'ghi chu them ghi chu ghi lai luu ghi chu note', add_comment: 'binh luan noi bo trao doi dong nghiep',
  // TIP-015d: chuyển / giao / đổi người phụ trách khách (không phải sửa trường khách) + đọc kết quả lần chuyển.
  transfer_owner: 'chuyen phu trach giao khach doi nguoi phu trach ban giao khach chuyen khach cho', transfer_owner_bulk: 'chuyen phu trach nhieu khach hang loat giao nhieu khach',
  transfer_status: 'ket qua chuyen phu trach lan chuyen gan nhat da chuyen kem bao nhieu',
  // TIP-012c: chiến dịch email — người nhận / kết quả giao thư / người gửi mail của DN.
  recipient_export: 'xuat danh sach nguoi nhan file nguoi nhan ket qua giao thu ket qua gui csv', mail_senders: 'nguoi gui email nguoi gui mail brevo smtp dia chi gui',
};

/** Từ riêng của một action khi đối tượng không có action `search` (TIP-012c: "tìm chiến dịch" → campaign.get — tra theo id / mã / tên). */
const ACTION_VI: Record<string, string> = { 'campaign.get': 'tim tim kiem tra cuu danh sach nguoi nhan ket qua gui giao thu da mo' };

/** Cách người dùng gọi đối tượng ngoài tên chuẩn (không dấu) — "dịch vụ", "gói", "liệu trình" đều là `product` (loại service / package). */
const ENTITY_VI: Record<string, string> = {
  campaign: 'chien dich marketing ban tin email hang loat gui hang loat',
  product: 'dich vu goi lieu trinh hang hoa mat hang gia ban', stock: 'kho ton kho con hang nhap kho', contact: 'khach nguoi lien he so dien thoai',
  quote: 'bao gia', appointment: 'lich dat lich hen', ticket: 'khieu nai phan nan yeu cau ho tro', order: 'don don hang',
  tag: 'nhan the', conversation: 'hoi thoai tin nhan chat', invoice: 'thanh toan thu tien', loyalty: 'diem tich diem hang khach than thiet', payment: 'thanh toan thu tien',
  // TIP-038b: nhập dữ liệu dùng chung từ tệp (khách / sản phẩm / báo giá / đơn / hợp đồng / đề nghị thanh toán) — "nhập từ tệp / file / excel".
  transfer: 'nhap du lieu tep file excel csv bang tinh nhap khach nhap san pham nhap bao gia nhap don nhap hop dong nhap de nghi thanh toan nhap ghi chu nhap viec cham soc nhap co hoi',
  // TIP-026b: hoạt động CRM — việc chăm sóc (≠ tác vụ AI / lịch hẹn), cơ hội (giá trị kỳ vọng ≠ doanh thu), xem hoạt động của khách.
  contact_task: 'viec cham soc viec can lam nhac viec goi lai theo doi follow up han viec',
  contact_opportunity: 'co hoi co hoi ban hang nhu cau gia tri ky vong xac suat chot deal',
  contact_activity: 'hoat dong ghi chu binh luan viec cham soc co hoi gia tri ky vong cua khach xem co hoi',
  contact_note: 'ghi chu binh luan cua khach',
};

/**
 * Chữ tìm kiếm (không dấu) theo 3 tầng, khớp tầng trước thì không xét tầng sau: tên (id + tên đối tượng vi / en) → module
 * (key + tên module vi / en) → mô tả (en, viết cho LLM).
 */
function tiersOf(a: ActionDef): [string, string, string] {
  const verb = a.id.slice(a.id.indexOf('.') + 1);
  const name = [a.id.replaceAll('.', ' ').replaceAll('_', ' '), VERB_VI[verb] ?? VERB_VI[verb.split('_')[0]!] ?? '', ENTITY_VI[entityOf(a.id)] ?? '', ACTION_VI[a.id] ?? ''];
  const mod: string[] = [a.module];
  for (const l of ['vi', 'en']) {
    const m = serverMessages(l).ai.assistant;
    name.push((m.entity as Record<string, string>)[entityOf(a.id)] ?? '');
    mod.push((m.module as Record<string, string>)[a.module] ?? '');
  }
  return [foldText(name.join(' ')), foldText(mod.join(' ')), foldText(a.description)];
}

const INDEX = new Map(registry.map((a) => [a.id, tiersOf(a)]));

/** Khuôn input lồng nhau: `{ field | field?: 'type' | {…} | [phần tử] }` (enum → giá trị). */
export function briefSchema(def: ActionDef): Record<string, Brief> {
  return schemaBrief(inputSchemaOf(def));
}

/** Ví dụ input tối thiểu (ô bắt buộc) — kèm khuôn khi model gọi sai. */
export const exampleInput = (def: ActionDef) => exampleOf(briefSchema(def));

/** Action có handler thật (không phải NOT_IMPLEMENTED). Registry chưa load → không action nào (fail closed). */
export type Implemented = (actionId: string) => boolean;

export interface FoundAction {
  id: string;
  module: string;
  risk: string;
  description: string;
  input: Record<string, Brief>;
}

/**
 * `find_actions(query, module?)`: mọi từ khoá (không dấu) phải có trong chữ tìm kiếm. Trả nhóm khớp ở tầng sớm nhất: tên đối tượng
 * ("bao gia" → quote.*), rồi module ("ban hang" → sales), rồi mô tả.
 */
export function findActions(authz: AuthzContext, mode: AssistantMode, query: string, module?: string, limit = FIND_LIMIT, implemented: Implemented = () => false): FoundAction[] {
  const words = foldText(query).split(/[^a-z0-9_]+/).filter((w) => w.length > 1);
  const tiers: ActionDef[][] = [[], [], []];
  const candidates: ActionDef[] = [];
  for (const a of registry) {
    if (module && a.module !== module) continue;
    if (!allowedFor(a, authz) || !modeAllows(a, mode) || !implemented(a.id)) continue;
    candidates.push(a);
    const [name, mod, desc] = INDEX.get(a.id)!;
    const has = (text: string) => words.every((w) => text.includes(w));
    if (has(name)) tiers[0]!.push(a);
    else if (has(`${name} ${mod}`)) tiers[1]!.push(a);
    else if (has(`${name} ${mod} ${desc}`)) tiers[2]!.push(a);
  }
  // Không action nào khớp đủ mọi từ (câu tự nhiên có từ ngoài chỉ mục, vd. "sửa giá dịch vụ") → xếp theo số từ khớp, cần ≥ một nửa.
  const hit = tiers.find((t) => t.length) ?? (words.length > 1 ? ranked(words, candidates) : []);
  return hit.slice(0, limit).map((a) => ({ id: a.id, module: a.module, risk: a.risk, description: a.description, input: briefSchema(a) }));
}

/** Điểm = số từ khớp ở tên (×2) hoặc module / mô tả (×1); giữ action đạt ≥ một nửa số từ ở tên + module + mô tả, điểm cao trước. */
function ranked(words: string[], candidates: ActionDef[]): ActionDef[] {
  const scored = candidates.map((a) => {
    const [name, mod, desc] = INDEX.get(a.id)!;
    const all = `${name} ${mod} ${desc}`;
    const matched = words.filter((w) => all.includes(w));
    return { a, n: matched.length, score: matched.reduce((t, w) => t + (name.includes(w) ? 2 : 1), 0) };
  });
  return scored.filter((x) => x.n * 2 >= words.length).sort((x, y) => y.score - x.score).map((x) => x.a);
}
