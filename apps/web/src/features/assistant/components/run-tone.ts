// Màu theo trạng thái thật của run + theo agent (TIP-019b §5.4) — chỉ token (`packages/ui/tokens`), không mã màu rời.
import { color } from '@appchat/ui';
import type { RunLifecycle } from '../run-types';

export interface RunTone {
  fg: string;
  bg: string;
  bar: string;
}

const RUNNING: RunTone = { fg: color.paidText, bg: color.paidBg, bar: color.blue };
const WAITING: RunTone = { fg: color.amberText, bg: color.alertBg, bar: color.warnAmber };
const DONE: RunTone = { fg: color.brandInk, bg: color.brandBg, bar: color.brand };
const FAILED: RunTone = { fg: color.dangerDeep, bg: color.dangerSoftBg, bar: color.danger };
const STOPPED: RunTone = { fg: color.textBtn2, bg: color.muteBg, bar: color.text4 };

export const RUN_TONE: Record<RunLifecycle, RunTone> = {
  queued: RUNNING,
  running: RUNNING,
  waiting_approval: WAITING,
  waiting_child: WAITING,
  waiting_operation: WAITING,
  waiting_usage: WAITING,
  completed: DONE,
  failed: FAILED,
  cancelled: STOPPED,
  handoff: STOPPED,
};

const AGENT_TINT: Record<string, [string, string]> = {
  'Operations Agent': [color.dealBg, color.amberGold],
  'Sales Agent': [color.brandBg, color.brandInk],
  'Support Agent': [color.infoBg, color.blue],
  'Marketing Agent': [color.groupBg, color.violet],
};
export const agentTint = (name: string): [string, string] => AGENT_TINT[name] ?? [color.muteBg, color.textBtn2];
