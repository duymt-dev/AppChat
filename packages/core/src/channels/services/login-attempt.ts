// Trạng thái kết nối cho khối `qr` của Trợ lý (TIP-023c hợp đồng 1, standard §2 DC-227): gộp tài khoản (DB tenant) + lần đăng nhập
// hiện hành (Redis, worker ghi) → DTO đã làm sạch: KHÔNG ảnh QR, KHÔNG credential; ảnh chỉ qua `qr_ref` (route có auth, đúng attempt).
// Map trạng thái native 7 giá trị → 5 giá trị của khối qr (starting→waiting, declined→failed reason). Hết TTL Redis → suy từ tài khoản.
import { AppError, genUiLoginStatus, type ChannelLoginStateDto, type ChannelStatusDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ChannelControl } from './control';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL = new Set(['connected', 'expired', 'failed']);

type Db = Pick<TenantTx, 'channelAccount'>;

export function loginDto(accountId: string, s: ChannelLoginStateDto | null, accountStatus: string): ChannelStatusDto['login'] {
  if (!s) {
    // Redis hết hạn: chỉ còn trạng thái tài khoản — không còn attempt / QR để hiện.
    if (accountStatus === 'connected') return { attempt: null, status: 'connected', expires_at: null, qr_ref: null, terminal: true };
    if (accountStatus === 'expired') return { attempt: null, status: 'expired', expires_at: null, qr_ref: null, terminal: true };
    return null;
  }
  const g = genUiLoginStatus(s.status);
  const ref = g.status === 'waiting' && s.qr && s.attempt ? `/settings/channels/${accountId}/login/qr?attempt=${encodeURIComponent(s.attempt)}` : null;
  return { attempt: s.attempt ?? null, status: g.status, ...(g.reason ? { reason: g.reason } : {}), expires_at: s.expires_at, qr_ref: ref, terminal: TERMINAL.has(g.status) };
}

export async function channelStatusOf(db: Db, control: Pick<ChannelControl, 'login'> | null, accountId: string): Promise<ChannelStatusDto> {
  const row = UUID.test(accountId) ? await db.channelAccount.findUnique({ where: { id: accountId }, select: { id: true, type: true, name: true, status: true } }) : null;
  if (!row || row.status === 'disconnected') throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
  const s = control ? await control.login(row.id) : null;
  return { channel_account_id: row.id, type: row.type, name: row.name, account_status: row.status, login: row.type === 'zalo_personal' ? loginDto(row.id, s, row.status) : null };
}

/** Ảnh QR của đúng attempt đang chờ quét (route có auth). Lần khác / đã quét / hết hạn → 404 (không phát lại QR cũ). */
export async function qrImageOf(db: Db, control: Pick<ChannelControl, 'login'> | null, accountId: string, attempt: string): Promise<{ png_base64: string; expires_at: string | null }> {
  const row = UUID.test(accountId) ? await db.channelAccount.findUnique({ where: { id: accountId }, select: { id: true, status: true } }) : null;
  const s = row && control ? await control.login(row.id) : null;
  if (!row || !s || s.status !== 'waiting' || !s.qr || !s.attempt || s.attempt !== attempt) throw new AppError('NOT_FOUND', 404, { qr: 'not_available' });
  return { png_base64: s.qr, expires_at: s.expires_at };
}
