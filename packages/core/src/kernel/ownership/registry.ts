// Registry port chuyển phụ trách (TIP-015d §2.2): InboxModule / SalesModule / BookingModule đăng ký port lúc boot; CRM chỉ đọc registry.
// Đăng ký trùng → lỗi boot (một port mỗi domain). Thiếu port domain được yêu cầu → 503 cho cả lần chuyển (không giả 0).
import { AppError } from '@appchat/shared';
import type { OwnershipDomain, OwnershipPort } from './ports';

const PORTS = new Map<OwnershipDomain, OwnershipPort>();

export function registerOwnershipPort(port: OwnershipPort): void {
  const cur = PORTS.get(port.domain);
  if (cur && cur !== port) throw new Error(`OwnershipPort '${port.domain}' đã đăng ký`);
  PORTS.set(port.domain, port);
}

export function ownershipPort(domain: OwnershipDomain): OwnershipPort {
  const p = PORTS.get(domain);
  if (!p) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { [domain]: 'port_unavailable' });
  return p;
}

export const registeredOwnershipDomains = (): OwnershipDomain[] => [...PORTS.keys()].sort();

/** Chỉ test: gỡ port (module unload / boot lại trong cùng tiến trình). */
export function unregisterOwnershipPort(domain: OwnershipDomain): void {
  PORTS.delete(domain);
}
