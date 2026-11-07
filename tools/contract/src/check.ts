// Kiểm một phản hồi action theo contract chung (Blueprint §4.1 + action-registry): envelope ActionResult + zod output.
import { getAction } from '@appchat/actions';
import { z } from 'zod';

const actionResult = z.object({
  result: z.unknown(),
  action_log_id: z.string().min(1),
  undo_until: z.string().datetime().optional(),
  ui_target: z.unknown().optional(),
});

const actionAccepted = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('preview_required'),
    preview: z.object({ summary: z.string() }).passthrough(),
    confirm_token: z.string().min(1),
    expires_at: z.string().datetime(),
  }),
  z.object({ status: z.literal('approval_required'), approval_id: z.string().min(1) }),
]);

export type ContractOutcome = { ok: true; status: 200 | 202 } | { ok: false; status: number; issues: string[] };

const issuesOf = (e: z.ZodError, prefix: string) => e.issues.map((i) => `${prefix}${i.path.join('.') || '(root)'}: ${i.message}`);

/** `data` = phần trong envelope `{ data }` (mock transport trả sẵn; HTTP thì `body.data`). */
export function checkActionResponse(actionId: string, status: number, data: unknown): ContractOutcome {
  const def = getAction(actionId);
  if (!def) return { ok: false, status, issues: [`action ${actionId} không có trong registry`] };
  if (status === 202) {
    const a = actionAccepted.safeParse(data);
    return a.success ? { ok: true, status } : { ok: false, status, issues: issuesOf(a.error, 'accepted.') };
  }
  if (status !== 200) return { ok: false, status, issues: [`status ${status} ngoài 200 / 202`] };
  const env = actionResult.safeParse(data);
  if (!env.success) return { ok: false, status, issues: issuesOf(env.error, 'data.') };
  const out = def.output.safeParse(env.data.result);
  return out.success ? { ok: true, status } : { ok: false, status, issues: issuesOf(out.error, 'result.') };
}
