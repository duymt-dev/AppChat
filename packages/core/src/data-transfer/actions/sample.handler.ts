// transfer.sample (TIP-038b P3, DC-374): đọc tệp người gọi đã tải (cùng guard `checkFile` như transfer.plan — chính người tải, purpose
// import | attachment) → sheet, cột, ≤ 20 dòng mẫu ĐÃ CHE, trường registry + ánh xạ đoán. Không ghi gì. Không có quyền nhập thực thể →
// `import_supported: false` (vẫn xem được cột của tệp mình tải — không lộ dữ liệu khác).
import { Inject, Injectable } from '@nestjs/common';
import {
  AppError,
  guessTransferMapping,
  transferSpec,
  type TransferSampleDto,
} from '@appchat/shared';
import type { ActionInput, transferSample } from '@appchat/actions';
import type { ActionContext } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { checkFile } from '../../kernel/files/file-access';
import { actorUserId } from '../../crm/public';
import { TransferDeps } from '../data-transfer.providers';
import { parseTransferFile } from '../services/file-parser';
import { TRANSFER_FILE_RULE } from '../services/planner';
import { maskedSample } from '../services/sample';
import { resolveTarget } from '../services/dataset';
import { canImport } from '../services/plan-view';

type In = ActionInput<typeof transferSample>;

@Injectable()
@ActionHandler('transfer.sample')
export class TransferSampleHandler implements Handler<In, TransferSampleDto> {
  constructor(@Inject(TransferDeps) private readonly d: TransferDeps) {}

  async prepare(ctx: ActionContext, i: In): Promise<TransferSampleDto> {
    const target = resolveTarget(i.entity, i.dataset);
    const userId = actorUserId(ctx);
    if (!userId) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    const db = await this.d.db(ctx.workspaceId, 'transfer.sample');
    const g = await checkFile(db, userId, i.file_id, TRANSFER_FILE_RULE, this.d.now());
    if ('denied' in g) throw new AppError('VALIDATION_FAILED', 422, { file_id: g.denied });
    const f = await this.d.files().read(db, g.id);
    if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    const t = await parseTransferFile({ name: f.row.name, mime: f.row.mime, body: f.body }, i.sheet);
    const spec = transferSpec(target);
    return {
      dataset: spec.dataset,
      file_name: f.row.name,
      sheets: t.sheets,
      sheet: t.sheet,
      columns: t.columns,
      total_rows: t.rows.length,
      sample: maskedSample(t.rows),
      fields: spec.fields.map((x) => ({
        key: x.key,
        type: x.type,
        required: !!x.required,
        ...(x.options ? { options: [...x.options] } : {}),
        ...(x.scope === 'item' ? { item: true } : {}),
        ...(x.hint ? { hint: x.hint } : {}),
        ...(x.warnings ? { warnings: [...x.warnings] } : {}),
      })),
      mapping: guessTransferMapping(target, t.columns),
      import_supported: spec.importReady && canImport(ctx.authz, target),
    };
  }

  async execute(
    _ctx: ActionContext,
    _i: In,
    _tx: unknown,
    _ptx?: unknown,
    prepared?: unknown,
  ): Promise<HandlerOutcome<TransferSampleDto>> {
    return { result: prepared as TransferSampleDto };
  }
}
