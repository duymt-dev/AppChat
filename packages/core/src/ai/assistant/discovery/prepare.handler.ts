// assistant.discovery_prepare (TIP-023e §1.4): chỉ TẠO yêu cầu dựng kho đã xác nhận — bounded, Cowork-only (require ctx.runId của
// chính lượt Trợ lý đang chạy, không nhận lời gọi trực tiếp không gắn root). Giành lease NGUYÊN TỬ qua `claimGeneration` (generation.ts
// §1.3/§1.5); nếu một gốc khác đã giành (building/ready/unknown) thì KHÔNG tạo yêu cầu dựng thứ hai — trả thẳng trạng thái đang có.
// Chỉ khi THẮNG lease mới phát `assistant.discovery_requested` để build processor (ROLE=ai, pha sau) nhận và chạy embedding NGOÀI
// transaction này. Preview đọc corpus TRƯỚC (bounded, không ghi) để người dùng thấy đúng số action sẽ dựng trước khi xác nhận.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ModelSource } from '@appchat/ai';
import type { ActionInput, ActionPreview, assistantDiscoveryPrepare } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { implementedBy } from '../../../kernel/actions/executor';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { uuidv7 } from '../../../kernel/ids';
import { buildCorpus } from './corpus';
import { claimGeneration } from './generation';
import { resolveEmbeddingSpace } from './embedding-space';
import { embeddingSpaceKey } from './types';

export const DISCOVERY_MODEL_SOURCE = Symbol('DISCOVERY_MODEL_SOURCE');

type Out = { generation_id: string; status: 'building' | 'ready' | 'failed' | 'unknown'; expected_count: number };

/** Root run tin cậy của lượt Cowork hiện hành — không lấy từ input model, chỉ từ `ActionContext.runId` do runtime đặt (mirror
 *  `run-lineage.ts`). Gọi trực tiếp / không có root run (vd. API thẳng không qua Trợ lý) → từ chối (§1.4 "reject task/agent source
 *  or unbound direct call"). */
async function trustedRoot(tx: Pick<TenantTx, 'aiRun'>, ctx: ActionContext): Promise<string> {
  if (ctx.source !== 'assistant' || !ctx.runId) throw new AppError('FORBIDDEN', 403, { source: 'cowork_only' }, 'Chỉ chạy được qua phiên Cowork đang hoạt động');
  const run = await tx.aiRun.findUnique({ where: { id: ctx.runId }, select: { id: true, rootRunId: true } });
  if (!run) throw new AppError('INVALID_STATE', 409, { run: 'missing' }, 'Run hiện hành không tồn tại');
  return run.rootRunId;
}

@Injectable()
@ActionHandler('assistant.discovery_prepare')
export class AssistantDiscoveryPrepareHandler implements Handler<ActionInput<typeof assistantDiscoveryPrepare>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
    @Optional() @Inject(DISCOVERY_MODEL_SOURCE) private readonly models: ModelSource | null = null,
  ) {}

  private corpus() {
    const implemented = this.executor ? implementedBy(this.executor) : (() => false);
    return buildCorpus(implemented);
  }

  async execute(ctx: ActionContext, _i: ActionInput<typeof assistantDiscoveryPrepare>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const rootRunId = await trustedRoot(tx, ctx);
    const space = await resolveEmbeddingSpace(this.models);
    if (!space) throw new AppError('NOT_IMPLEMENTED', 501, { embed: 'no_model_route' }, 'Chưa cấu hình model embedding — tìm kiếm vẫn dùng được bằng từ khoá');
    const corpus = this.corpus();
    const now = this.clock.now();
    const buildOperationId = uuidv7(now.getTime());
    const claim = await claimGeneration(tx, { corpusHash: corpus.corpusHash, space, buildOperationId, ownerRootRunId: rootRunId, expectedCount: corpus.docs.length, now });
    if (claim.kind === 'existing') {
      // Một gốc khác đang building/ready/unknown — không tạo yêu cầu dựng thứ hai, không phát event mới (§1.5 "does not steal a lease").
      return { result: { generation_id: claim.generation.id, status: claim.generation.phase, expected_count: claim.generation.expectedCount }, noUndo: true };
    }
    return {
      result: { generation_id: claim.generation.id, status: 'building', expected_count: claim.generation.expectedCount },
      noUndo: true,
      events: [{ topic: 'assistant.discovery_requested', payload: { generation_id: claim.generation.id, corpus_hash: corpus.corpusHash, embedding_space: embeddingSpaceKey(space) } }],
    };
  }

  async preview(): Promise<ActionPreview> {
    const corpus = this.corpus();
    const space = await resolveEmbeddingSpace(this.models);
    return preview('write', line(`${corpus.docs.length} action`, space ? `${space.provider}:${space.model}` : 'chưa có model embedding'), {
      count: corpus.docs.length,
      changes: [{ entity: 'action_discovery_generation', after: { actions: corpus.docs.length, embedding_space: space ? embeddingSpaceKey(space) : null } }],
      ...(space ? {} : { warnings: ['no_model_route'] }),
    });
  }
}
