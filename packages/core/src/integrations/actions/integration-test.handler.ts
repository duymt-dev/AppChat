// integration.test (integrations.manage, read — TIP-023c G3, DEF-012-1): kiểm thông tin đăng nhập KHÔNG lưu gì. Có `fields` → bản nháp
// (tách theo manifest, ô bí mật đi qua đường bí mật — executor che ở action_log); không có → kết nối hiện có của workspace (giải mã chỉ
// trong bộ nhớ). Gọi adapter ở `prepare` (ngoài transaction, ≤ 10 giây); `execute` chỉ trả kết quả. Không tạo / sửa dòng kết nối,
// không đổi health. Quyền người gọi đã được executor kiểm trước `prepare` (trước adapter).
import { Inject, Injectable } from '@nestjs/common';
import { adapterFor, connectorRegistry, resolveMode } from '@appchat/integrations';
import { AppError } from '@appchat/shared';
import type { ActionInput, integrationTest } from '@appchat/actions';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { splitFields } from '../services/connections.service';
import { connectorEntry, probe, type ProbeResult } from '../services/form-schema';
import { IntegrationResolver } from '../services/resolver';

type Input = ActionInput<typeof integrationTest>;
type Out = { status: ProbeResult['status']; reason?: string };

@Injectable()
@ActionHandler('integration.test')
export class IntegrationTestHandler implements Handler<Input, Out> {
  constructor(@Inject(IntegrationResolver) private readonly resolver: IntegrationResolver | null) {}

  async prepare(ctx: ActionContext, input: Input): Promise<Out> {
    const e = connectorEntry(connectorRegistry, input.provider);
    let r: ProbeResult;
    if (input.fields) {
      // Chế độ theo manifest (mặc định live) — không lùi live → sandbox; chế độ ngoài manifest → 422.
      const mode = resolveMode(e.manifest, input.mode);
      if (!mode) throw new AppError('VALIDATION_FAILED', 422, { mode: 'unsupported' });
      // Tách theo manifest (thiếu ô bắt buộc → 422) — cùng luật với integration.connect. "Sắp có" / không adapter: probe trả unsupported.
      const draft = e.manifest.status === 'coming_soon' || !adapterFor(e, mode)?.test ? { config: {}, secrets: {} } : splitFields(e, input.fields);
      r = await probe(e, { id: 'draft', mode, ...draft });
    } else {
      const conn = this.resolver ? await this.resolver.byConnector(ctx.workspaceId, input.provider) : null;
      r = conn ? await probe(e, conn) : { status: 'not_connected' };
    }
    return 'reason' in r ? { status: r.status, reason: r.reason } : { status: r.status };
  }

  async execute(_ctx: ActionContext, _input: Input, _tx: unknown, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    return { result: prepared as Out };
  }
}
