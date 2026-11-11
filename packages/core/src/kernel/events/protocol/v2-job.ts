// Điểm vào job v2 của queue `events` (TIP-003b §4.1, §5.1): chưa sẵn sàng (manifest chưa thoả) → KHÔNG tiêu thụ — trả lỗi để BullMQ
// ghi job thất bại, hàng event_dispatch bền vẫn `pending` và được quét khôi phục khi sẵn sàng. Sẵn sàng → dispatchV2 với hợp đồng của
// registry đã đóng băng. Log chỉ id / kết cục / lý do — không payload.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AppLogger } from '../../logger/logger';
import { dispatchV2, type DispatchOutcome } from './dispatch-claim';
import { eventReadiness } from './readiness';
import { frozenEventRegistry } from './registry';
import { recordDispatch } from './diagnostics';
import type { RegistryTable } from './types';

export class EventProtocolNotReadyError extends Error {
  readonly code = 'EVENT_PROTOCOL_NOT_READY';
}

const cache = new Map<number, RegistryTable>();

export async function dispatchV2Job(resolver: TenantDbResolver, job: { id: string; workspaceId: string }, log?: AppLogger): Promise<DispatchOutcome> {
  const ready = eventReadiness();
  const frozen = frozenEventRegistry();
  if (!ready?.ready || !frozen) throw new EventProtocolNotReadyError('event protocol chưa sẵn sàng');
  const db = await resolver.get(TenantContexts.system(job.workspaceId, 'events-v2'));
  const [st] = await db.$queryRaw<{ epoch: number }[]>`SELECT epoch FROM event_protocol_state WHERE id = 1`;
  const out = await dispatchV2({ db, workspaceId: job.workspaceId, contracts: frozen.contracts, epoch: st?.epoch ?? 0, now: () => new Date(), registryCache: cache }, job.id);
  recordDispatch(out);
  if (out.kind === 'blocked') log?.warn({ event_id: job.id, reason: out.reason }, 'event v2 bị chặn');
  else if (out.kind === 'retry') log?.warn({ event_id: job.id, code: out.code }, 'event v2 thử lại sau');
  return out;
}
