// Tài khoản kênh (REQ-B09, Blueprint §2.2 `channel_account`): tra / kiểm tài khoản, cấu hình mặc định + gộp patch, đếm hạn mức
// gói, đổi trạng thái (account + `tenant_channel_route` ở DB nền tảng + outbox `channel.status_changed`). Dùng chung API + worker.
import { AppError, serverMessages, type ChannelRoutingDto, type WeeklyScheduleDto } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trần tin chủ động / ngày của Zalo cá nhân (TIP-022d, D35c): mặc định 200, cho chỉnh 50–500, cảnh báo rủi ro khi > 200. */
export const ZALO_PROACTIVE_CAP = { default: 200, min: 50, max: 500 } as const;

/**
 * Kiểm khoảng cấu hình trần tin chủ động / ngày qua `channel.update_settings` (TIP-022d, D35c):
 * Zalo cá nhân cho chỉnh 50–500; vượt mặc định manifest (> 200) trả mã cảnh báo rủi ro khoá tài khoản.
 */
export function checkProactiveCap(type: string, capDefault: number | undefined, dailyCap: number | undefined): string[] {
  if (dailyCap === undefined) return [];
  if (type === 'zalo_personal' && (dailyCap < ZALO_PROACTIVE_CAP.min || dailyCap > ZALO_PROACTIVE_CAP.max)) {
    throw new AppError('VALIDATION_FAILED', 422, { daily_cap: 'out_of_range' });
  }
  return capDefault !== undefined && dailyCap > capDefault ? [`daily_cap_over_default:${capDefault}`] : [];
}

export type AccountStatus = 'pending' | 'connecting' | 'connected' | 'error' | 'disconnected' | 'expired';
/** Trạng thái ở `tenant_channel_route`: như account, thêm `paused` (worker chỉ giữ phiên tài khoản `connected`). */
export type RouteStatus = AccountStatus | 'paused';

export interface AccountSettings {
  agent_id: string | null;
  ai_mode: 'auto' | 'suggest' | 'off';
  hours: string;
  greeting: string;
  assign_mode: 'round_robin' | 'least_busy' | 'shift';
  sla_policy: string;
  sync_messages: boolean;
  sync_auto_create_contact: boolean;
  history_days: 0 | 7 | 30 | 90;
  /** Ghi đè `manifest.rateLimit` (omnichannel-adapter §6). */
  rate_per_minute?: number;
  daily_cap?: number;
  /** Trần gửi lời mời kết bạn / ngày (TIP-014b E — mặc định 20). */
  friend_daily_cap?: number;
  /** TIP-022b: lịch có cấu trúc của tài khoản (∩ lịch agent); null = chưa lưu — `hours` chỉ là ngữ cảnh hiển thị. */
  schedule?: WeeklyScheduleDto | null;
  /** TIP-022b: phân luồng từ khoá (opt-in) — tắt / vắng = `agent_id` như cũ. */
  routing?: ChannelRoutingDto;
  /** TIP-022b: lời chào tự động — cấu hình cũ mặc định tắt. */
  greeting_enabled?: boolean;
  /** TIP-014c: ghi đè SLA riêng theo tài khoản kênh (tùy chọn). */
  sla_override?: { first_response_min: number; resolution_min?: number } | null;
}

export interface AccountHealth {
  status?: 'connected' | 'degraded' | 'error' | 'expired';
  detail?: string;
  checked_at?: string;
}

export type AccountRow = NonNullable<Awaited<ReturnType<TenantDb['channelAccount']['findUnique']>>>;

export function defaultSettings(): AccountSettings {
  const d = serverMessages('vi').channels.defaults;
  return {
    agent_id: null,
    ai_mode: 'auto',
    hours: d.hours,
    greeting: '',
    assign_mode: 'round_robin',
    sla_policy: d.sla,
    sync_messages: true,
    sync_auto_create_contact: true,
    history_days: 30,
  };
}

export const settingsOf = (row: { settings: unknown }): AccountSettings => ({ ...defaultSettings(), ...((row.settings ?? {}) as Partial<AccountSettings>) });

/** Trạng thái route theo account: tạm dừng thắng `connected` (worker không giữ phiên). */
export const routeStatusOf = (status: AccountStatus, pausedAt: Date | null): RouteStatus => (pausedAt && status === 'connected' ? 'paused' : status);

type Db = Pick<TenantTx, 'channelAccount'>;
export type StatusEvent = { topic: 'channel.status_changed'; payload: Record<string, unknown> };

export class ChannelAccounts {
  constructor(private readonly platform: Pick<PlatformDb, 'tenantChannelRoute'>) {}

  /** Tài khoản chưa ngắt; id lạ / không phải uuid / đã ngắt → 404 (không lộ tài khoản đã xoá). */
  async live(db: Pick<TenantTx, 'channelAccount'>, id: string): Promise<AccountRow> {
    const row = UUID.test(id) ? await db.channelAccount.findUnique({ where: { id } }) : null;
    if (!row || row.status === 'disconnected') throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
    return row;
  }

  /** Số tài khoản kênh đang dùng (hạn mức `plan.max_channels` — REQ-L02). */
  countLive(db: Pick<TenantTx, 'channelAccount'>): Promise<number> {
    return db.channelAccount.count({ where: { status: { not: 'disconnected' } } });
  }

  /** Route ở DB nền tảng — worker-channels đọc để biết tài khoản cần giữ phiên + DB đích (Blueprint §2.0). Idempotent. */
  async route(ws: string, row: { id: string; type: string; externalId: string | null }, status: RouteStatus, db: Pick<PlatformDb, 'tenantChannelRoute'> = this.platform): Promise<void> {
    await db.tenantChannelRoute.upsert({
      where: { channelAccountId: row.id },
      create: { channelAccountId: row.id, workspaceId: ws, type: row.type, externalId: row.externalId, status },
      update: { status, externalId: row.externalId },
    });
  }

  /**
   * Đổi trạng thái (worker: QR xong / hết phiên / lỗi; action: tạm dừng / ngắt). Ghi account trong `tx`, trả event
   * `channel.status_changed` (null nếu trạng thái hiển thị không đổi) để người gọi ghi outbox cùng transaction. Route ở DB
   * nền tảng ghi SAU commit (`route`) — không có transaction chung hai DB; lệch tạm được vòng lease của worker sửa lại.
   */
  async setStatus(
    tx: Db,
    row: AccountRow,
    patch: { status?: AccountStatus; pausedAt?: Date | null; health?: AccountHealth },
    now: Date,
    reason?: string,
  ): Promise<{ row: AccountRow; event: StatusEvent | null }> {
    const status = patch.status ?? (row.status as AccountStatus);
    const pausedAt = patch.pausedAt === undefined ? row.pausedAt : patch.pausedAt;
    const changed = status !== row.status || !!pausedAt !== !!row.pausedAt;
    const next = await tx.channelAccount.update({
      where: { id: row.id },
      data: {
        status,
        pausedAt,
        ...(patch.health ? { health: { ...patch.health, checked_at: now.toISOString() } } : {}),
        ...(status === 'disconnected' ? { credentialsEnc: null } : {}),
        lastEventAt: now,
        // Đổi trạng thái → thế hệ phiên mới (TIP-014b C): chủ phiên hiện tại không đặt chỗ gửi / thao tác được nữa.
        ...(changed ? { sessionGeneration: { increment: 1 } } : {}),
      },
    });
    const payload = { channel_account_id: row.id, type: row.type, name: next.name, status, paused: !!pausedAt, ...(reason ? { reason } : {}) };
    return { row: next, event: changed ? { topic: 'channel.status_changed', payload } : null };
  }
}
