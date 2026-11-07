// integration.sync_now (integrations.manage, write — TIP-012b §4.2) + integration.get / integration.list_calls (read — §5.1).
// sync_now: kết nối hiện có (404 chung nếu lạ) → `if_version` khớp phiên bản khoá → adapter đúng chế độ có `pull` + feed tài chính đang bật
// (không thì `unsupported`, không đặt mốc đồng bộ giả) → đã có lượt kéo đang chờ / chạy → trả lượt đó (`coalesced`) → không thì biên nhận
// `queued` trong transaction của executor; job đẩy SAU commit (mất job → quét khôi phục 60 giây nhặt lại). Không Redis → 503, không nhận việc.
// Gửi lại cùng Idempotency-Key → executor trả đúng biên nhận cũ. Không kết nối / đổi khoá / đổi feed.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import { connectorRegistry } from '@appchat/integrations';
import type { ActionInput, integrationGet, integrationListCalls, integrationSyncNow } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { BANK_PULL_OP, activeFeed } from '../operations/bank-pull';
import { upsertCall } from '../operations/call-receipt';
import { IntegrationOps } from '../operations/call-runner';
import { capabilitiesOf } from '../services/connection-health';
import { ConnectionDetailReader, callDto } from '../services/connection-detail';
import { syncNowPreview } from './previews/integration-sync.handler.preview';

type SyncIn = ActionInput<typeof integrationSyncNow>;
type SyncOut = { status: 'accepted' | 'unsupported'; call: ReturnType<typeof callDto> | null; reason?: string; coalesced: boolean };

const notFound = () => new AppError('NOT_FOUND', 404, { connection: 'not_found' });

@Injectable()
@ActionHandler('integration.sync_now')
export class IntegrationSyncNowHandler implements Handler<SyncIn, SyncOut> {
  constructor(
    @Inject(IntegrationOps) private readonly ops: IntegrationOps | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: SyncIn, tx: TenantTx): Promise<HandlerOutcome<SyncOut>> {
    const conn = await tx.integrationConnection.findUnique({ where: { id: input.connection_id } });
    if (!conn || conn.status === 'disconnected') throw notFound();
    if (input.if_version !== undefined && input.if_version !== conn.credentialRev) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });
    const unsupported = (reason: string): HandlerOutcome<SyncOut> => ({ result: { status: 'unsupported', call: null, reason, coalesced: false } });
    if (!capabilitiesOf(connectorRegistry.get(conn.connectorKey), conn.mode).pull) return unsupported('no_pull');
    if (!(await activeFeed(tx, conn.id))) return unsupported('no_bank_binding');
    if (!this.ops) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { queue: 'unavailable' });

    const pending = await tx.integrationCallLog.findFirst({ where: { connectionId: conn.id, op: BANK_PULL_OP, nextAttemptAt: { not: null } }, orderBy: { createdAt: 'desc' } });
    if (pending) return { result: { status: 'accepted', call: callDto(pending), coalesced: true } };

    const now = this.clock.now();
    const { row } = await upsertCall(
      tx,
      { connectionId: conn.id, op: BANK_PULL_OP, refId: `manual:${uuidv7(now.getTime())}`, refType: 'sync_now', configRev: conn.credentialRev, safety: 'read', requestedBy: ctx.onBehalfOfUserId ?? ctx.actor.id },
      now,
    );
    // Lần kéo tay đầu tiên = chọn bật kéo tự động (opt-in): mốc kích hoạt = bây giờ (không kéo lùi lịch sử — §3.2, §4.3).
    const feed = await activeFeed(tx, conn.id);
    await tx.bankPullState.upsert({
      where: { connectionId: conn.id },
      create: { connectionId: conn.id, feedId: feed!.id, checkpointAt: now, credentialRev: conn.credentialRev, nextPullAt: now },
      update: {},
    });
    const ops = this.ops;
    const ws = ctx.workspaceId;
    return {
      result: { status: 'accepted', call: callDto(row), coalesced: false },
      after: { connection_id: conn.id, call_id: row.id, op: BANK_PULL_OP },
      afterCommit: () => ops.enqueue(ws, row.id, row.nextAttemptAt),
    };
  }

  async preview(_ctx: ActionContext, input: SyncIn, tx: TenantTx) {
    return syncNowPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('integration.get')
export class IntegrationGetHandler implements Handler<ActionInput<typeof integrationGet>, unknown> {
  private readonly reader = new ConnectionDetailReader(connectorRegistry);
  async execute(_ctx: ActionContext, input: ActionInput<typeof integrationGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    return { result: await this.reader.detail(tx, input.connection_id) };
  }
}

@Injectable()
@ActionHandler('integration.list_calls')
export class IntegrationListCallsHandler implements Handler<ActionInput<typeof integrationListCalls>, unknown> {
  private readonly reader = new ConnectionDetailReader(connectorRegistry);
  async execute(_ctx: ActionContext, input: ActionInput<typeof integrationListCalls>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    return { result: await this.reader.logs(tx, input.connection_id, input.cursor, input.limit) };
  }
}
