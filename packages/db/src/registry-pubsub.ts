// Vô hiệu cache registry workspace giữa các tiến trình (TIP-006c, DEF-002-2): `TenantDbResolver.invalidate(ws)` xoá cache cục bộ rồi
// publish kênh Redis `tenant-registry:invalidate`; mọi tiến trình api / worker subscribe → xoá cục bộ (không publish lại — không vòng).
// Chỉ là tín hiệu tăng tốc: mất Redis / publish lỗi → nuốt lỗi, cache tự hết hạn theo TTL 60 giây (+ thế hệ trạng thái 2 giây — TIP-040)
// như cũ, không chặn lời gọi DB. Kiểu client cấu trúc (ioredis thoả) — gói db không phụ thuộc ioredis.

export const REGISTRY_INVALIDATE_CHANNEL = 'tenant-registry:invalidate';

const WS_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Phần client Redis cần cho kênh (publish ở một kết nối, subscribe ở kết nối riêng — Redis yêu cầu). */
export interface PubSubClient {
  publish(channel: string, message: string): Promise<unknown>;
  subscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
  quit(): Promise<unknown>;
}

/** Cổng phát tín hiệu mà resolver gọi khi `invalidate` — không ném lỗi, không chờ. */
export interface RegistryBus {
  publish(workspaceId: string): void;
}

/** Phía nhận: xoá cache registry cục bộ của một workspace (KHÔNG phát lại). */
export interface RegistryCache {
  drop(workspaceId: string): void;
  attachBus(bus: RegistryBus | null): void;
}

export interface RegistryBusHandle {
  close(): Promise<void>;
}

/**
 * Nối resolver vào kênh: publish qua `pub`, nghe qua `sub` (hai kết nối đã nhân bản). Subscribe không chờ ở boot — Redis chưa sẵn sàng
 * thì client tự xếp lệnh tới khi nối được; lỗi chỉ báo qua `onError`.
 */
export function connectRegistryBus(cache: RegistryCache, pub: PubSubClient, sub: PubSubClient, onError: (err: unknown) => void = () => undefined): RegistryBusHandle {
  sub.on('message', (channel, message) => {
    if (channel === REGISTRY_INVALIDATE_CHANNEL && WS_ID.test(message)) cache.drop(message);
  });
  void sub.subscribe(REGISTRY_INVALIDATE_CHANNEL).catch(onError);
  cache.attachBus({
    publish: (workspaceId) => {
      void pub.publish(REGISTRY_INVALIDATE_CHANNEL, workspaceId).catch(onError);
    },
  });
  return {
    async close() {
      cache.attachBus(null);
      await Promise.all([pub.quit().catch(() => undefined), sub.quit().catch(() => undefined)]);
    },
  };
}
