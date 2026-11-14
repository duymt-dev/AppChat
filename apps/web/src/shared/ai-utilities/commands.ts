// Lệnh gạch chéo nhận diện được trong ô soạn Trợ lý (TIP-019c §4.2): chỉ đúng 4 id; lệnh lạ giữ nguyên là chữ nháp, không chạy action nào.
import { UTILITY_ACTIONS } from '@appchat/shared';
import type { IconName } from '@appchat/ui';
import type { UtilityActionId } from './types';

const SET: ReadonlySet<string> = new Set(UTILITY_ACTIONS);

/** `/ai.summarize` (có thể kèm khoảng trắng / chữ sau) → id; còn lại → null. */
export function utilityCommandOf(draft: string): UtilityActionId | null {
  const m = draft.trim().match(/^\/(ai\.[a-z_]+)(?:\s|$)/);
  return m && SET.has(m[1]!) ? (m[1] as UtilityActionId) : null;
}

export const UTILITY_ICONS: Record<UtilityActionId, IconName> = {
  'ai.summarize': 'ic-doc',
  'ai.detect_intent': 'ic-search',
  'ai.extract_info': 'ic-tag',
  'ai.score_lead': 'ic-trend',
};
