// Gói tin realtime worker → API (Blueprint §4.6 fan-out): worker phát qua redis-emitter `serverSideEmit(RT_EVENT, envelope)`;
// mỗi node API nhận, lọc từng socket trong `rooms` theo workspace + AuthzContext của socket (outbox §8) rồi mới emit.
import type { PermissionKey, ScopeModule } from '@appchat/shared';
import type { ScopeFields } from '../../authz/scope';
import type { ModulePolicy, RecordRef } from '../../authz/data-access';

export const WS_NAMESPACE = '/ws';
/** Tên sự kiện server-side giữa các node (không bao giờ tới client). */
export const RT_EVENT = 'appchat:rt';

export const rooms = {
  ws: (workspaceId: string) => `ws:${workspaceId}`,
  user: (userId: string) => `user:${userId}`,
  conv: (conversationId: string) => `conv:${conversationId}`,
};

export interface RealtimeRequire {
  permission?: PermissionKey;
  /** Bản ghi (owner / assignee / contact) phải trong data scope của người nhận. */
  scope?: { module: ScopeModule; row: Record<string, unknown>; fields: ScopeFields };
  /**
   * Bản ghi nghiệp vụ theo policy ĐỌC chung (TIP-042c, record-policy): owner / assignee / team / quan hệ khách (collaborator + watcher).
   * Quan hệ khách tra lúc phát (`registerGrantLookup` — quyền hiện tại, không theo payload cũ); `mineUserId` = người được tính own
   * riêng của module (hội thoại: phụ trách khách; ticket: người tạo).
   */
  record?: { policy: ModulePolicy; ref: RecordRef; mineUserId?: string | null };
  /** Run AI người nhận phải còn đọc được (TIP-019b, `registerRunGuard`) — tra lại lúc phát, một lần mỗi user. */
  run?: { runId: string };
}

export interface RealtimeEnvelope {
  ws: string;
  rooms: string[];
  event: string;
  data: unknown;
  require?: RealtimeRequire;
  /** Không gửi tới user này (người gây ra sự kiện). */
  exceptUserId?: string;
  /** Lệnh cho socket của một user trước khi emit: làm mới AuthzContext (đổi vai trò) / ngắt (bị gỡ khỏi workspace). */
  control?: { type: 'refresh_authz' | 'disconnect'; userId: string };
}
