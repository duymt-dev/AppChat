// Settings registry (Blueprint §7.2): nhóm nav + mục in-scope theo prototype setNav L9810. Mục OUT ẩn (prototype-parity §6):
// Sơ đồ tổ chức, Phòng ban (cây — mục `teams` chỉ là nhóm phẳng TIP-042), KPI, Phân ca, Workflow (Routing chỉ phần chia lead P1 — TIP-042b), API / Playground / Developer, Bảo mật / SSO / Compliance, Đối tác tiếp thị.
// `wallet` gom Gói & ví (billing nằm trong cùng mục); `doc_templates` là màn mới D30 (không có trong prototype).
import type { IconName } from '@appchat/ui';
import type { PermissionKey } from '@appchat/shared';

export type SectionKey =
  | 'general' | 'locale' | 'members' | 'roles' | 'teams' | 'org_sla' | 'channels' | 'web_widget' | 'integrations'
  | 'contacts_fields' | 'tags' | 'replies' | 'profile_360' | 'doc_templates' | 'ai_models' | 'rag_data' | 'ai_gov' | 'ai_audit'
  | 'audit' | 'notifications' | 'billing' | 'wallet' | 'profile' | 'sales_policy' | 'routing' | 'email_mkt' | 'booking';

export interface NavItem {
  key: SectionKey;
  icon: IconName;
  /** Số đếm cạnh nhãn (prototype). */
  n?: string;
  badge?: 'NEW' | 'PRO';
  /** Quyền xem mục; thiếu quyền → mục vẫn hiện nhưng màn ở trạng thái no-permission. */
  perm?: PermissionKey;
}

export interface NavGroup {
  key: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  { key: 'workspace', items: [{ key: 'general', icon: 'ic-cog' }, { key: 'locale', icon: 'ic-globe' }] },
  {
    key: 'users',
    items: [
      { key: 'members', icon: 'ic-users', n: '12', perm: 'members.manage' },
      { key: 'roles', icon: 'ic-shield', n: '5' },
      // Nhóm phẳng (TIP-042, REQ-A05b): vị trí "Phòng ban" của prototype L10301 nhưng chỉ nhóm phẳng — không cây / chi nhánh (P3 OUT).
      { key: 'teams', icon: 'ic-grid', perm: 'members.manage' },
    ],
  },
  { key: 'ops', items: [{ key: 'org_sla', icon: 'ic-clock', badge: 'NEW', perm: 'sla.manage' }] },
  {
    key: 'apps',
    items: [
      { key: 'channels', icon: 'ic-globe', perm: 'channels.manage' },
      { key: 'integrations', icon: 'ic-grid', perm: 'integrations.manage' },
      { key: 'contacts_fields', icon: 'ic-grid', perm: 'crm.fields_manage' },
      // Hồ sơ 360° — mẫu & gán vai trò (ver2.1 REQ-M05; prototype L10303: ngay sau Trường dữ liệu, trước Thẻ & nhãn).
      { key: 'profile_360', icon: 'ic-users', badge: 'NEW', perm: 'settings.manage' },
      { key: 'tags', icon: 'ic-gift', n: '24', perm: 'inbox.manage' },
      { key: 'replies', icon: 'ic-bolt', n: '48', perm: 'inbox.manage' },
    ],
  },
  {
    key: 'ai',
    items: [
      { key: 'ai_models', icon: 'ic-spark', badge: 'PRO', perm: 'ai.governance' },
      { key: 'rag_data', icon: 'ic-doc', badge: 'NEW', perm: 'kb.manage' },
      { key: 'ai_gov', icon: 'ic-shield', perm: 'ai.governance' },
      { key: 'ai_audit', icon: 'ic-clock', perm: 'audit.view' },
    ],
  },
  // TỰ ĐỘNG HOÁ (prototype L10305): chỉ mở "Routing & assignment" phần P1 — chia lead mới (TIP-042b, PD-019); Cấu hình workflow vẫn OUT.
  { key: 'automation', items: [{ key: 'routing', icon: 'ic-arrow', perm: 'crm.reassign' }] },
  { key: 'security', items: [{ key: 'audit', icon: 'ic-clock', perm: 'audit.view' }] },
  {
    key: 'finance',
    items: [
      { key: 'notifications', icon: 'ic-bell' },
      { key: 'wallet', icon: 'ic-gift', badge: 'NEW', perm: 'billing.manage' },
      // Màn mới D30 — đặt cuối nav để không đẩy lệch các mục có trong prototype (prototype-parity §7).
      { key: 'doc_templates', icon: 'ic-doc', badge: 'NEW', perm: 'documents.manage' },
      // Chính sách bán hàng (TIP-032b P1, COMMERCE §3 Q5) — màn mới, cuối nav như doc_templates; Owner sửa, quyền settings.manage xem.
      { key: 'sales_policy', icon: 'ic-shield', badge: 'NEW', perm: 'settings.manage' },
      // Lịch hẹn (TIP-033b, DEF-033-1): giờ mở cửa + nhân sự / ca riêng — màn mới, cuối nav như doc_templates (prototype-parity §7).
      { key: 'booking', icon: 'ic-cal', badge: 'NEW', perm: 'booking.config' },
    ],
  },
];

/** Mục không có dòng nav (vào từ nơi khác): widget / Email Marketing từ Nền tảng kết nối, billing từ ví / Nâng cấp, hồ sơ từ menu avatar. */
const HIDDEN: Record<string, NavItem> = {
  web_widget: { key: 'web_widget', icon: 'ic-globe', perm: 'channels.manage' },
  billing: { key: 'billing', icon: 'ic-dollar', perm: 'billing.manage' },
  // TIP-012c (prototype L7033 `email_mkt`): vào từ thẻ Brevo / SMTP ở Nền tảng kết nối hoặc chọn người gửi ở wizard chiến dịch.
  email_mkt: { key: 'email_mkt', icon: 'ic-mail', perm: 'campaign.manage' },
  profile: { key: 'profile', icon: 'ic-users' },
};

/** Đường dẫn cũ trỏ vào Cài đặt (onboarding, dashboard) → mục registry. */
const ALIAS: Record<string, SectionKey> = { sla: 'org_sla', 'canned-replies': 'replies', fields: 'contacts_fields', rag: 'rag_data' };

export const ALL_ITEMS: NavItem[] = [...NAV.flatMap((g) => g.items), ...Object.values(HIDDEN)];

export const resolveSection = (raw: string | undefined): NavItem =>
  ALL_ITEMS.find((i) => i.key === (ALIAS[raw ?? ''] ?? raw)) ?? NAV[0]!.items[0]!;
