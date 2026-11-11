// Hiệu ứng `channel.system_transition` (TIP-003c §2, §4.5) — thân transaction cũ của login.processor / sessions.markDown dời vào đây.
// commit_login_result: kết quả đăng nhập đã mã hoá được stage NGOÀI hiệu ứng (khoá theo tài khoản + lần đăng nhập, TTL ngắn), handler đọc
// lại tài khoản trong transaction — phải còn `connecting` (người dùng đã ngắt / bấm lại → no_effect), không trùng Zalo đang dùng ở tài khoản
// khác. mark_*: chỉ áp khi thế hệ phiên hiện tại = thế hệ của trigger (sự kiện trễ của phiên cũ không hạ kết nối mới).
import { serverMessages } from '@appchat/shared';
import type { SystemOutput } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { routeStatusOf, type AccountStatus, type ChannelAccounts, type RouteStatus } from '../services/accounts.service';

export type Effect = { out: SystemOutput; events: OutboxEventInput[]; route?: { row: { id: string; type: string; externalId: string | null }; status: RouteStatus } };
const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });

/** Kết quả đăng nhập đã xác thực (stage bởi worker đăng nhập — credential đã mã hoá, không đi qua input / log). */
export interface StagedLogin {
  externalId: string;
  name: string;
  credentialsEnc: string;
}

export async function commitLogin(tx: TenantTx, accounts: ChannelAccounts, id: string, staged: StagedLogin | null, now: Date): Promise<Effect> {
  if (!staged) return none(id, 'result_missing');
  await tx.$queryRaw`SELECT 1 FROM channel_account WHERE id = ${id}::uuid FOR UPDATE`;
  const cur = await tx.channelAccount.findUnique({ where: { id } });
  if (!cur || cur.status !== 'connecting') return none(id, 'not_connecting');
  // Cùng Zalo đã gắn vào tài khoản khác đang dùng → không tạo bản trùng (unique partial `channel_account_external_live_key`).
  const dup = await tx.channelAccount.findFirst({ where: { type: cur.type, externalId: staged.externalId, status: { not: 'disconnected' }, id: { not: id } }, select: { id: true } });
  if (dup) return none(id, 'duplicate');
  const defaultName = serverMessages('vi').channels.name.zalo_personal;
  await tx.channelAccount.update({
    where: { id },
    data: {
      externalId: staged.externalId,
      credentialsEnc: new Uint8Array(Buffer.from(staged.credentialsEnc, 'base64')),
      // Nhãn người dùng đặt ở bước 2 giữ nguyên; nhãn mặc định ("Zalo cá nhân") thay bằng tên + SĐT Zalo.
      ...(cur.name === defaultName ? { name: staged.name.slice(0, 60) } : {}),
    },
  });
  const { row: next, event } = await accounts.setStatus(tx, { ...cur, externalId: staged.externalId }, { status: 'connected', pausedAt: null, health: { status: 'connected' } }, now);
  return {
    out: { disposition: 'applied', operation_id: id },
    events: [{ topic: 'channel.connected', payload: { channel_account_id: id, type: cur.type, name: next.name } }, ...(event ? [event] : [])],
    route: { row: next, status: 'connected' },
  };
}

export async function markUnavailable(tx: TenantTx, accounts: ChannelAccounts, id: string, reason: 'expired' | 'send_errors', generation: number, detail: string | undefined, now: Date): Promise<Effect> {
  await tx.$queryRaw`SELECT 1 FROM channel_account WHERE id = ${id}::uuid FOR UPDATE`;
  const row = await tx.channelAccount.findUnique({ where: { id } });
  if (!row || row.status === 'disconnected') return none(id, 'disconnected');
  if (row.sessionGeneration !== generation) return none(id, 'stale_generation');
  const patch = reason === 'expired' ? { status: 'expired' as const, health: { status: 'expired' as const, ...(detail ? { detail } : {}) } } : { pausedAt: now, health: { status: 'degraded' as const, ...(detail ? { detail } : {}) } };
  const { row: next, event } = await accounts.setStatus(tx, row, patch, now, reason);
  return { out: { disposition: event ? 'applied' : 'no_effect', operation_id: id, ...(event ? {} : { reason_code: 'unchanged' }) }, events: event ? [event] : [], route: { row: next, status: routeStatusOf(next.status as AccountStatus, next.pausedAt) } };
}
