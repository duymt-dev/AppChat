// Khởi động giao thức sự kiện v2 SAU khi Nest init (TIP-003b §5.1): mọi provider đã đăng ký hợp đồng → đóng băng registry → so manifest
// kỳ vọng độc lập → đặt sẵn sàng. Chưa sẵn sàng thì dispatcher v2 không tiêu thụ job nào (hàng dispatch bền chờ); v1 chạy như cũ. Log
// chỉ tên consumer / chủ adapter — không dữ liệu khách.
import { startEventProtocol, type AppLogger, type Readiness } from '@appchat/core';
import { EVENT_PROTOCOL_MANIFEST } from './event-protocol.manifest';

export function startEvents(role: string, infra: boolean, log: AppLogger): Readiness {
  const r = startEventProtocol({ manifest: EVENT_PROTOCOL_MANIFEST, role, infra });
  const detail = { role, digest: r.digest, missing: r.missing, unexpected: r.unexpected, mismatched: r.mismatched, blockers: r.blockers.length };
  if (r.ready) log.info(detail, 'event protocol v2 sẵn sàng');
  else log.info(detail, 'event protocol v2 chưa sẵn sàng — giữ v1, không tiêu thụ job v2');
  return r;
}
