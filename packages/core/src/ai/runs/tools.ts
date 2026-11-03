// Tool = action (agent-gateway §2, Blueprint §5.1): ToolSpec sinh từ ActionDef (zod → JSON Schema, mô tả cho LLM), `execute` gọi
// ActionExecutor với ngữ cảnh của run (source agent / assistant / task, `onBehalfOfUserId`, runId). Kết quả executor → ToolOutcome:
// 200 → ok; 202 preview → needs_confirmation; 202 approval → needs_approval; AppError → error (run tiếp, model thấy lý do).
// Không logic nghiệp vụ ở đây. Tên tool = id action đổi `.` → `__` (provider không nhận dấu chấm trong tên tool).
import { z } from 'zod';
import type { ActionDef } from '@appchat/actions';
import type { JsonSchema, ToolOutcome, ToolSpec } from '@appchat/ai';
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ToolExecutor } from '../../kernel/actions/executor';

export const toolNameOf = (actionId: string) => actionId.replaceAll('.', '__');
export const toolActionId = (toolName: string) => toolName.replaceAll('__', '.');

/** JSON Schema cho input của action (bỏ `$schema` — một số provider từ chối khoá này). */
export function inputSchemaOf(def: ActionDef): JsonSchema {
  const schema = { ...(z.toJSONSchema(def.input, { io: 'input', unrepresentable: 'any' }) as JsonSchema & { $schema?: string }) };
  delete schema.$schema;
  return schema;
}

export function actionTool(def: ActionDef, executor: ToolExecutor, ctxOf: (stepIdx: number, toolCallId: string) => ActionContext): ToolSpec {
  return {
    name: toolNameOf(def.id),
    description: def.description,
    inputSchema: inputSchemaOf(def),
    origin: 'action',
    async execute(input, meta): Promise<ToolOutcome> {
      try {
        const out = await executor.execute(ctxOf(meta.stepIdx, meta.toolCallId), def.id, input);
        if (out.status === 200) return { kind: 'ok', output: out.data.result };
        const a = out.data;
        if (a.status === 'preview_required') return { kind: 'needs_confirmation', preview: a.preview, confirmToken: a.confirm_token, canonicalInput: input };
        return { kind: 'needs_approval', approvalId: a.approval_id };
      } catch (err) {
        if (err instanceof AppError) return { kind: 'error', code: err.code, message: err.fields ? `${err.message} ${JSON.stringify(err.fields)}` : err.message };
        throw err;
      }
    },
  };
}
