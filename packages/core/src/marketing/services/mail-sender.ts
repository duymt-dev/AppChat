// Người gửi mail của DN cho chiến dịch email (TIP-012c §2): đọc định danh người gửi dùng được từ bằng chứng thăm dò của ĐÚNG kết nối
// (`integration_connection.mail_senders` cho `probed_rev` = `credential_rev`) — không bao giờ chọn "kết nối mới nhất" lúc gửi. Không đọc
// khoá / cấu hình bí mật. `sender_rev` = credential_rev lúc chọn: kết nối lại / sửa người gửi / ngắt → tăng rev → bản duyệt cũ không khớp.
// Brevo: chỉ người gửi provider báo `active` (sender_verified). SMTP: chỉ người gửi tích hợp viên đã xác nhận (`configured`) qua kết nối
// đăng nhập + TLS (authenticated_transport — không phải xác minh tên miền).
import { AppError, type CampaignSender, type MailSenderDto, type MailSenderState, type RecipientDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

type Db = Pick<TenantTx, 'integrationConnection'>;
type Evidence = { state?: string; events?: boolean; senders?: { id: string; email: string; name: string; state: string }[] };
type ConnRow = { id: string; connectorKey: string; name: string; mode: string; status: string; credentialRev: number; probedRev: number | null; lastProbeStatus: string | null; lastProbeAt: Date | null; mailSenders: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT = { id: true, connectorKey: true, name: true, mode: true, status: true, credentialRev: true, probedRev: true, lastProbeStatus: true, lastProbeAt: true, mailSenders: true } as const;
const STATES = new Set<string>(['configured', 'unverified', 'authenticated_transport', 'sender_verified', 'unsupported', 'degraded']);
/** Trạng thái người gửi được phép gửi chiến dịch. */
const SENDABLE = new Set<string>(['sender_verified', 'configured']);

function why(c: ConnRow, ev: Evidence | null, state: string): string | null {
  if (c.status !== 'connected') return c.status === 'disconnected' ? 'disconnected' : 'connection_error';
  if (c.mode !== 'live') return 'sandbox';
  if (c.probedRev !== c.credentialRev || !ev) return 'probe_pending';
  if (c.lastProbeStatus !== 'verified') return 'probe_failed';
  if (!SENDABLE.has(state)) return state === 'unverified' && c.connectorKey === 'smtp' ? 'sender_unconfirmed' : 'sender_inactive';
  return null;
}

function sendersOf(c: ConnRow): MailSenderDto[] {
  const ev = c.probedRev === c.credentialRev && c.mailSenders && typeof c.mailSenders === 'object' ? (c.mailSenders as Evidence) : null;
  const list = ev?.senders?.length ? ev.senders : [];
  const transport = c.connectorKey === 'smtp' ? 'authenticated_transport' : 'provider_api';
  if (!list.length) {
    // Chưa có bằng chứng thăm dò cho phiên bản khoá hiện tại → một dòng "chờ thăm dò" (không suy người gửi từ cấu hình đã lưu).
    return [{ connection_id: c.id, connector: c.connectorKey, connection_name: c.name, sender_id: '', email: '', name: '', state: 'configured', transport, events: false, sender_rev: c.credentialRev, usable: false, reason: why(c, null, 'configured') ?? 'probe_pending', probed_at: c.lastProbeAt?.toISOString() ?? null }];
  }
  return list.map((s) => {
    const state = (STATES.has(s.state) ? s.state : 'degraded') as MailSenderState;
    const reason = why(c, ev, state);
    return { connection_id: c.id, connector: c.connectorKey, connection_name: c.name, sender_id: s.id, email: s.email, name: s.name, state, transport, events: !!ev?.events, sender_rev: c.credentialRev, usable: !reason, reason, probed_at: c.lastProbeAt?.toISOString() ?? null };
  });
}

/** Mọi người gửi của các kết nối mail còn hiệu lực (kể cả chưa dùng được — kèm lý do để người dùng biết cần làm gì). */
export async function listMailSenders(tx: Db): Promise<MailSenderDto[]> {
  const rows = await tx.integrationConnection.findMany({ where: { port: 'mail', status: { not: 'disconnected' } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: SELECT });
  return rows.flatMap((r) => sendersOf(r as ConnRow));
}

/** Đúng (kết nối, người gửi) đã chọn — kết nối theo id (không lùi sang kết nối khác). Không có → null. */
export async function findMailSender(tx: Db, connectionId: string, senderId: string): Promise<MailSenderDto | null> {
  const c = UUID.test(connectionId) ? await tx.integrationConnection.findUnique({ where: { id: connectionId }, select: { ...SELECT, port: true } }) : null;
  if (!c || c.port !== 'mail') return null;
  const all = sendersOf(c as ConnRow);
  return all.find((s) => s.sender_id === senderId && s.sender_id !== '') ?? null;
}

/** Chọn người gửi lúc tạo / sửa / gửi duyệt: phải tồn tại và dùng được NGAY (thông điệp đọc được cho Trợ lý). */
export async function requireMailSender(tx: Db, connectionId: string, senderId: string): Promise<MailSenderDto> {
  const s = await findMailSender(tx, connectionId, senderId);
  if (!s) throw new AppError('VALIDATION_FAILED', 422, { sender: 'not_found' }, 'Mail sender not found on that connection — list choices with campaign.mail_senders.');
  if (!s.usable) throw new AppError('VALIDATION_FAILED', 422, { sender: s.reason ?? 'unusable' }, `Mail sender is not usable (${s.reason}) — ask an integrations manager to fix the connection, then pick it again.`);
  return s;
}

type SenderCols = { senderKind: string; accountId: string | null; mailConnectionId: string | null; mailSenderId: string | null; mailSenderRev: number | null };

/** Phần người gửi trong băm bản duyệt — chỉ mail của DN (chiến dịch kênh cũ giữ công thức băm như trước, bản chờ duyệt cũ vẫn khớp). */
export const senderHashPart = (c: Partial<SenderCols>) => (c.senderKind === 'tenant_mail' ? ['tenant_mail', c.mailConnectionId ?? null, c.mailSenderId ?? null, c.mailSenderRev ?? null] : null);

/** Chiếu người gửi cho DTO đọc (kèm trạng thái dùng được hiện tại — kết nối đổi sau khi chọn → usable=false, reason=sender_changed). */
export function senderView(c: SenderCols, mail: Map<string, MailSenderDto>): CampaignSender {
  if (c.senderKind !== 'tenant_mail' || !c.mailConnectionId || !c.mailSenderId) return { kind: 'channel_account', account_id: c.accountId };
  const s = mail.get(`${c.mailConnectionId}:${c.mailSenderId}`);
  const reason = !s ? 'not_found' : s.sender_rev !== c.mailSenderRev ? 'sender_changed' : s.reason;
  return { kind: 'tenant_mail', connection_id: c.mailConnectionId, sender_id: c.mailSenderId, sender_rev: c.mailSenderRev ?? 0, email: s?.email ?? '', name: s?.name ?? '', usable: !reason, reason };
}

export const senderKey = (s: Pick<MailSenderDto, 'connection_id' | 'sender_id'>) => `${s.connection_id}:${s.sender_id}`;

export type SenderChoice = { kind: 'channel_account'; account_id: string } | { kind: 'tenant_mail'; connection_id: string; sender_id: string };
export type SenderData = { senderKind: 'channel_account' | 'tenant_mail'; mailConnectionId: string | null; mailSenderId: string | null; mailSenderRev: number | null };

/** Cột người gửi mail của DN từ lựa chọn đã kiểm (kênh phải là email; người gửi dùng được ngay). */
export async function mailSenderData(tx: Db, channel: string, choice: Extract<SenderChoice, { kind: 'tenant_mail' }>): Promise<SenderData> {
  if (channel !== 'email') throw new AppError('VALIDATION_FAILED', 422, { sender: 'email_only' }, 'Business mail senders only work for Email campaigns.');
  const s = await requireMailSender(tx, choice.connection_id, choice.sender_id);
  return { senderKind: 'tenant_mail', mailConnectionId: s.connection_id, mailSenderId: s.sender_id, mailSenderRev: s.sender_rev };
}

export const CHANNEL_SENDER: SenderData = { senderKind: 'channel_account', mailConnectionId: null, mailSenderId: null, mailSenderRev: null };

/**
 * Kiểm lại người gửi mail đã chốt (gửi duyệt / duyệt): còn đúng kết nối + định danh + phiên bản và dùng được — kết nối lại / sửa người gửi /
 * ngắt / thăm dò hỏng → 409 (chọn lại người gửi rồi gửi duyệt lại; không bao giờ đổi sang kết nối khác).
 */
type SenderRef = Pick<SenderCols, 'mailConnectionId' | 'mailSenderId' | 'mailSenderRev'>;

async function currentOf(tx: Db, c: SenderRef): Promise<{ s: MailSenderDto | null; reason: string | null }> {
  const s = c.mailConnectionId && c.mailSenderId ? await findMailSender(tx, c.mailConnectionId, c.mailSenderId) : null;
  const gone = !s && c.mailConnectionId && UUID.test(c.mailConnectionId) ? await tx.integrationConnection.findUnique({ where: { id: c.mailConnectionId }, select: { status: true } }) : null;
  return { s, reason: !s ? (gone?.status === 'disconnected' ? 'disconnected' : 'not_found') : s.sender_rev !== c.mailSenderRev ? 'sender_changed' : s.reason };
}

/** Lý do người gửi đã chốt không còn dùng được (null = dùng được) — dispatch giữ / tạm dừng theo lý do này. */
export const mailSenderProblem = async (tx: Db, c: SenderRef) => (await currentOf(tx, c)).reason;

export async function assertMailSenderCurrent(tx: Db, c: SenderRef): Promise<MailSenderDto> {
  const { s, reason } = await currentOf(tx, c);
  if (reason || !s) throw new AppError('INVALID_STATE', 409, { sender: reason ?? 'not_found' }, `The campaign's mail sender changed or is not usable (${reason}) — pick a sender again with campaign.update, then resubmit.`);
  return s;
}

type Delivery = NonNullable<RecipientDto['delivery']>;

/**
 * Bằng chứng giao thư của trang người nhận (TIP-012c §5.2): biên nhận theo dispatch_ref `cr_<id>` (một truy vấn cho cả trang, index
 * dispatch unique). Không suy "đã mở" từ accepted; SMTP (không sự kiện) đã nhận → `unavailable` cho bước giao.
 */
export async function deliveryOf(tx: Pick<TenantTx, 'tenantMailDelivery' | 'integrationConnection'>, campaignId: string, recipientIds: string[]): Promise<Map<string, Delivery>> {
  if (!recipientIds.length) return new Map();
  const rows = await tx.tenantMailDelivery.findMany({ where: { campaignId, dispatchRef: { in: recipientIds.map((id) => `cr_${id}`) } }, select: { dispatchRef: true, connectionId: true, state: true, facts: true } });
  if (!rows.length) return new Map();
  const conns = await tx.integrationConnection.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.connectionId))] } }, select: { id: true, connectorKey: true } });
  const smtp = new Set(conns.filter((c) => c.connectorKey === 'smtp').map((c) => c.id));
  return new Map(rows.map((r) => {
    const f = (r.facts ?? {}) as { delivered?: boolean; bounced?: string; complained?: boolean };
    const v: Delivery =
      r.state === 'accepted' ? (f.complained ? 'complained' : f.bounced === 'hard' ? 'bounced' : f.delivered ? 'delivered' : smtp.has(r.connectionId) ? 'unavailable' : 'accepted')
      : r.state === 'failed_before_accept' ? 'failed' : r.state === 'unknown' ? 'unknown' : 'queued';
    return [r.dispatchRef.slice(3), v];
  }));
}
