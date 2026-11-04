// Chiếu audit an toàn (TIP-045b annex A2): danh mục action nhạy cảm (cờ `action_log.audit` + thông báo Owner), nhãn hành động không lấy
// từ input thô, trạng thái OK / Warn / Escalated, và che sâu theo schema cho bản ghi audit nền tảng (không mã OTP, credential, prompt,
// nội dung tin, URL có token). Thuần (không DB) — dùng chung khi ghi (executor / tenant-receipt / platform audit) và khi đọc.
import type { ActionDef } from '@appchat/actions';
import type { AuditStatus } from '@appchat/shared';
import { maskSecrets } from '../actions/secret-fields';
import { redactDeep } from '../actions/executor-redact';

/** Sự kiện bảo mật theo rbac §7: đổi vai trò, mời / gỡ thành viên, kết nối / ngắt kênh, xuất dữ liệu, đổi chủ (+ phiên mới — sessions). */
export const SECURITY_ACTIONS: ReadonlySet<string> = new Set([
  'member.set_role',
  'member.invite',
  'member.remove',
  'invite.revoke',
  'workspace.transfer_ownership',
  'channel.zalo.start_login',
  'channel.email.connect',
  'channel.reconnect',
  'channel.disconnect',
  'bank_feed.connect',
  'bank_feed.disconnect',
  'integration.connect',
  'integration.disconnect',
  'contact.export',
]);

/** Sự kiện bảo mật không phải action (phiên đăng nhập thiết bị mới). */
export const SESSION_NEW_DEVICE = 'session.new_device';

export const isSecurityAction = (id: string) => SECURITY_ACTIONS.has(id) || id === SESSION_NEW_DEVICE;

/** Khoá nhạy cảm bỏ hẳn khỏi bản ghi audit (ngoài ô bí mật theo ActionDef): mã, token, nội dung tin, prompt, URL ký. */
const DROP = /^(otp|code|token|password|secret|api_?key|access_token|refresh_token|body|text|html|content|prompt|messages?|sign_url|url|signature_png|file_base64)$/i;

function dropDeep(v: unknown, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => dropDeep(x, depth + 1));
  return Object.fromEntries(Object.entries(v).filter(([k]) => !DROP.test(k)).map(([k, x]) => [k, dropDeep(x, depth + 1)]));
}

/** Input / kết quả đưa vào audit: ô bí mật theo ActionDef → khoá PII chung → bỏ khoá nhạy cảm. */
export function auditSafe(def: Pick<ActionDef, 'secret'> | undefined, v: unknown): unknown {
  if (v === undefined) return undefined;
  return dropDeep(redactDeep(def ? maskSecrets(def, v) : v));
}

/** Trạng thái hiển thị audit workspace: thất bại / đã hoàn tác → warn; còn lại ok. */
export function auditStatusOf(status: string): AuditStatus {
  return status === 'succeeded' ? 'ok' : 'warn';
}

/** Trạng thái AI audit theo trạng thái run. */
export function aiAuditStatusOf(status: string): AuditStatus {
  if (status === 'failed' || status === 'cancelled') return 'warn';
  if (status === 'handoff' || status === 'waiting_approval') return 'escalated';
  return 'ok';
}

/** Actor AI audit theo loại run (khoá i18n `settings.audit.aiActor.*`). */
export function aiActorOf(kind: string): string {
  if (kind === 'assistant') return 'copilot';
  if (kind === 'agent_reply' || kind === 'delegate' || kind === 'consult') return 'agent';
  return kind;
}
