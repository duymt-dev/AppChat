// admin.agent_template.upsert (TIP-040 pha 2, DC-370): mẫu agent ở DB nền tảng. Tool mặc định phải là action có trong registry +
// agentGrantable (D51 — mẫu không cấp quyền vượt; quyền thật của agent vẫn = quyền agent ∩ người tạo lúc chạy). Sửa bằng CAS
// `if_version`; active=false = ẩn khỏi catalog "Từ mẫu", không xoá / không sửa agent đã tạo từ mẫu (agent giữ bản sao cấu hình riêng).
// Mẫu đã sửa ghi `revision` hiện tại → nâng cấp mẫu dựng sẵn lúc boot không ghi đè (templates.seed).
import { Injectable } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminAgentTemplateUpsert } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { TEMPLATE_REVISION } from '../../ai/agents/template-revisions';
import { casConflict, invalidTools, requireVersion } from '../services/config-validation';

type Input = ActionInput<typeof adminAgentTemplateUpsert>;
type Output = { key: string; version: number; created: boolean };

const data = (i: Input) => ({
  role: i.role,
  industryGroup: i.industry_group,
  industry: i.industry,
  name: i.name,
  description: i.description,
  color: i.color,
  tint: i.tint,
  icon: i.icon,
  defaults: { ...i.defaults, tools: [...new Set(i.defaults.tools)], revision: TEMPLATE_REVISION },
  active: i.active,
  sort: i.sort,
});

/** Audit / preview không chép prompt dài — chỉ độ dài. */
const view = (t: { name: string; role: string; industry: string; active: boolean; sort: number; defaults: unknown }) => {
  const d = (t.defaults ?? {}) as { tools?: string[]; model_tier?: string; threshold?: number; prompt?: string };
  return { name: t.name, role: t.role, industry: t.industry, active: t.active, sort: t.sort, tools: d.tools ?? [], model_tier: d.model_tier ?? null, threshold: d.threshold ?? null, prompt_chars: d.prompt?.length ?? 0 };
};

function guard(i: Input) {
  const bad = invalidTools(i.defaults.tools);
  if (bad.length) throw new AppError('VALIDATION_FAILED', 422, Object.fromEntries(bad.map((t) => [`defaults.tools.${t}`, 'not_grantable'])));
}

@Injectable()
@ActionHandler('admin.agent_template.upsert')
export class AdminAgentTemplateUpsertHandler extends PlatformActionHandler<Input, Output> {
  async executePlatform(_ctx: PlatformContext, input: Input, ptx: PlatformTx): Promise<AdminOutcome<Output>> {
    guard(input);
    const cur = await ptx.agentTemplate.findUnique({ where: { key: input.key } });
    if (!cur) {
      if (input.if_version !== undefined) throw new AppError('NOT_FOUND', 404, { key: 'not_found' });
      const row = await ptx.agentTemplate.create({ data: { id: uuidv7(), key: input.key, ...data(input) } });
      return { result: { key: row.key, version: row.version, created: true }, after: view(row) };
    }
    requireVersion(input.if_version, cur.version);
    const n = await ptx.agentTemplate.updateMany({ where: { id: cur.id, version: cur.version }, data: { ...data(input), version: { increment: 1 } } });
    if (!n.count) throw casConflict(cur.version);
    const row = await ptx.agentTemplate.findUniqueOrThrow({ where: { id: cur.id } });
    return { result: { key: row.key, version: row.version, created: false }, before: view(cur), after: view(row) };
  }

  async previewPlatform(_ctx: PlatformContext, input: Input, db: PlatformDb) {
    guard(input);
    const cur = await db.agentTemplate.findUnique({ where: { key: input.key } });
    return {
      summary: `${input.key} · ${input.name}`,
      risk: 'config' as const,
      changes: [{ entity: 'agent_template', id: input.key, ...(cur ? { before: view(cur) } : {}), after: view({ ...data(input) }) }],
      // Agent đã tạo từ mẫu không đổi — chỉ agent tạo SAU dùng cấu hình mới.
      warnings: cur ? ['existing_agents_unchanged'] : [],
    };
  }
}
