// Lệnh UI của một lượt đến bằng hai đường (TIP-006c): sự kiện lượt (`ui_command` trong SSE / JSON) và realtime `ui.command` tới đúng tab.
// Chạy một lần: khoá = run + lệnh + thứ tự xuất hiện của chính lệnh đó trong từng đường (hai lệnh giống nhau trong một run vẫn chạy đủ
// hai lần); đường nào tới trước chạy, đường sau bỏ qua. Nhớ tối đa 200 khoá gần nhất.
'use client';
import type { UiCommand } from '@appchat/actions';

export type UiCommandSource = 'turn' | 'realtime';

const LIMIT = 200;
const done = new Set<string>();
const counters: Record<UiCommandSource, Map<string, number>> = { turn: new Map(), realtime: new Map() };

/** true = chưa chạy → caller chạy lệnh; false = đường kia đã chạy. */
export function claimUiCommand(source: UiCommandSource, runId: string | null | undefined, cmd: UiCommand): boolean {
  if (!runId) return true;
  const base = `${runId}:${JSON.stringify(cmd)}`;
  const n = (counters[source].get(base) ?? 0) + 1;
  counters[source].set(base, n);
  const key = `${base}#${n}`;
  if (done.has(key)) return false;
  done.add(key);
  if (done.size > LIMIT) done.delete(done.values().next().value as string);
  for (const m of Object.values(counters)) if (m.size > LIMIT) m.delete(m.keys().next().value as string);
  return true;
}
