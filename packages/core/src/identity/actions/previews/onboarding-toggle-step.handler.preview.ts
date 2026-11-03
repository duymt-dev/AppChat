// Preview checklist "Bắt đầu với AppChat" (TIP-023b R2.8): bước + đã xong trước / sau. Chỉ đọc `workspace.settings.onboarding_steps`.
import type { ActionInput, ActionPreview, onboardingToggleStep } from '@appchat/actions';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import type { PlatformRead } from './platform-read';

export async function togglePreview(p: PlatformRead, ws: string, i: ActionInput<typeof onboardingToggleStep>): Promise<ActionPreview> {
  const w = await p.workspace.findUniqueOrThrow({ where: { id: ws }, select: { settings: true } });
  const steps = (((w.settings ?? {}) as Record<string, unknown>).onboarding_steps ?? {}) as Record<string, boolean>;
  return preview('write', i.step, { changes: updated('onboarding_step', i.step, { done: steps[i.step] ?? false }, { done: i.done }) });
}
