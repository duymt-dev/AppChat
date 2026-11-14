// Đọc runtime kết nối (TIP-012b §5.1) — dùng chung cho HTTP (/v1/integrations/*) và action integration.get / list_calls (Trợ lý thấy
// đúng trạng thái biên nhận, không đường HTTP ẩn). Id lạ / khác workspace → 404 chung. Log: cursor (created_at, id) DESC — bước chọn id
// index-only trên `integration_call_log_conn_time_idx` rồi join lại theo PK (deferred join); không SELECT outcome / payload ở danh sách.
import { AppError, type CallLogPageDto, type CallReceiptDto, type ConnectionDetailDto, type RuntimeConnectorDto } from '@appchat/shared';
import type { ConnectorRegistry } from '@appchat/integrations';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import { IN_USE } from './connections.service';
import { capabilitiesOf, healthOf, maskAccount } from './connection-health';
import { BANK_PULL_OP } from '../operations/bank-pull';
import { PROBE_OP } from '../operations/probe';

type Db = Pick<TenantDb, 'integrationConnection' | 'integrationCallLog' | 'tenantBankFeed' | '$queryRaw'>;
type CallRow = { id: string; op: string; status: string; error: string | null; attempts: number; latencyMs: number | null; createdAt: Date; finishedAt: Date | null; nextAttemptAt: Date | null; outcome?: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => new AppError('NOT_FOUND', 404, { connection: 'not_found' });
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function callDto(r: CallRow, withOutcome = false): CallReceiptDto {
  return {
    id: r.id,
    op: r.op,
    status: r.status as CallReceiptDto['status'],
    reason: r.error,
    attempts: r.attempts,
    latency_ms: r.latencyMs,
    created_at: r.createdAt.toISOString(),
    finished_at: iso(r.finishedAt),
    next_attempt_at: iso(r.nextAttemptAt),
    ...(withOutcome ? { outcome: (r.outcome ?? null) as CallReceiptDto['outcome'] } : {}),
  };
}

const CALL_SELECT = { id: true, op: true, status: true, error: true, attempts: true, latencyMs: true, createdAt: true, finishedAt: true, nextAttemptAt: true } as const;

export class ConnectionDetailReader {
  constructor(private readonly registry: ConnectorRegistry) {}

  async connectors(db: Db): Promise<RuntimeConnectorDto[]> {
    const rows = await db.integrationConnection.findMany({ where: IN_USE });
    const byKey = new Map(rows.map((r) => [r.connectorKey, r]));
    return this.registry.listed().map((m) => {
      const r = byKey.get(m.key);
      const e = this.registry.get(m.key);
      return {
        key: m.key,
        name: m.name,
        port: m.port,
        status: m.status,
        modes: m.modes,
        capabilities: capabilitiesOf(e, r?.mode ?? 'live'),
        connection_id: r?.id ?? null,
        health: r ? healthOf(r) : null,
      };
    });
  }

  async detail(db: Db, id: string): Promise<ConnectionDetailDto> {
    if (!UUID.test(id)) throw notFound();
    const r = await db.integrationConnection.findUnique({ where: { id } });
    if (!r) throw notFound();
    const [pending, feed] = await Promise.all([
      db.integrationCallLog.findFirst({ where: { connectionId: id, op: { in: [BANK_PULL_OP, PROBE_OP] }, nextAttemptAt: { not: null } }, orderBy: { createdAt: 'desc' }, select: CALL_SELECT }),
      db.tenantBankFeed.findUnique({ where: { connectionId: id }, select: { status: true, accountNo: true } }),
    ]);
    const current = r.probedRev === r.credentialRev;
    return {
      id: r.id,
      connector_key: r.connectorKey,
      name: r.name,
      port: r.port,
      mode: r.mode,
      status: r.status,
      health: healthOf(r, pending?.op === PROBE_OP),
      credential_rev: r.credentialRev,
      capabilities: capabilitiesOf(this.registry.get(r.connectorKey), r.mode),
      probe: { status: (r.lastProbeStatus as ConnectionDetailDto['probe']['status']) ?? null, reason: r.lastProbeReason, at: iso(r.lastProbeAt), current },
      last_sync_at: iso(r.lastSyncAt),
      last_event_at: iso(r.lastEventAt),
      last_error: r.lastError,
      bank_binding: feed ? { active: feed.status === 'active', account_masked: maskAccount(feed.accountNo) } : null,
      pending_call: pending ? callDto(pending) : null,
      connected_at: r.createdAt.toISOString(),
    };
  }

  async logs(db: Db, id: string, cursor: string | undefined, limit = 20): Promise<CallLogPageDto> {
    if (!UUID.test(id) || !(await db.integrationConnection.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
    const take = Math.min(50, Math.max(1, limit));
    const c = decodeCursor(cursor);
    const after = c ? Prisma.sql`AND (l.created_at, l.id) < (${c.t}::timestamptz, ${c.id}::uuid)` : Prisma.empty;
    // Deferred join: chọn id theo index (connection_id, created_at DESC, id DESC) rồi lấy cột hiển thị theo PK.
    const rows = await db.$queryRaw<{ id: string; op: string; status: string; error: string | null; attempts: number; latency_ms: number | null; created_at: Date; finished_at: Date | null; next_attempt_at: Date | null }[]>`
      SELECT l.id, l.op, l.status::text AS status, l.error, l.attempts, l.latency_ms, l.created_at, l.finished_at, l.next_attempt_at
        FROM (SELECT id FROM integration_call_log l WHERE l.connection_id = ${id}::uuid ${after} ORDER BY l.created_at DESC, l.id DESC LIMIT ${take + 1}) s
        JOIN integration_call_log l ON l.id = s.id
       ORDER BY l.created_at DESC, l.id DESC`;
    const page = rows.slice(0, take).map((r) => callDto({ id: r.id, op: r.op, status: r.status, error: r.error, attempts: r.attempts, latencyMs: r.latency_ms, createdAt: r.created_at, finishedAt: r.finished_at, nextAttemptAt: r.next_attempt_at }));
    const last = rows.length > take ? rows[take - 1] : undefined;
    return { items: page, next_cursor: last ? encodeCursor(last.created_at, last.id) : null };
  }

  async call(db: Db, id: string, callId: string): Promise<CallReceiptDto> {
    if (!UUID.test(id) || !UUID.test(callId)) throw notFound();
    const r = await db.integrationCallLog.findFirst({ where: { id: callId, connectionId: id }, select: { ...CALL_SELECT, outcome: true } });
    if (!r) throw notFound();
    return callDto(r, true);
  }
}

export const encodeCursor = (t: Date, id: string) => Buffer.from(`${t.toISOString()}|${id}`).toString('base64url');

export function decodeCursor(c: string | undefined): { t: string; id: string } | null {
  if (!c) return null;
  const [t, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  if (!t || !id || !UUID.test(id) || Number.isNaN(Date.parse(t))) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { t, id };
}
