// Sổ nợ parity (DC-360): màn đã lệch > 5% trước khi chốt luật — TIP vẫn DONE được nhưng KHÔNG được làm tệ thêm. Màn trong sổ đạt khi
// ≤ trần ghi trong sổ; màn ngoài sổ vẫn ≤ MAX_DIFF_RATIO. Sổ chỉ rút ngắn: màn đã ≤ 5% thì báo "trả xong" để xoá dòng. Trả hết ở pha
// "trả nợ parity" trước TIP-046 (046 yêu cầu sổ rỗng).
import fs from 'node:fs';
import path from 'node:path';

export interface DebtEntry {
  /** Trần tỉ lệ lệch (mức cao nhất đo được ở CI Linux / máy dev Windows lúc ghi sổ, cộng biên nhiễu). */
  ceiling: number;
  /** TIP / pha chịu trả + lý do lệch đã biết. */
  owner: string;
  note: string;
}

export const DEBT_FILE = path.resolve(import.meta.dirname, '../parity-debt.json');

export function loadDebt(file = DEBT_FILE): Map<string, DebtEntry> {
  if (!fs.existsSync(file)) return new Map();
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as { screens: Record<string, DebtEntry> };
  return new Map(Object.entries(raw.screens));
}

export type Verdict = 'pass' | 'debt' | 'paid' | 'fail';

/** pass: ≤ ngưỡng, ngoài sổ · paid: trong sổ nhưng đã ≤ ngưỡng (xoá dòng) · debt: trong sổ, ≤ trần · fail: còn lại. */
export function verdict(ratio: number, max: number, debt?: DebtEntry): Verdict {
  if (ratio <= max) return debt ? 'paid' : 'pass';
  return debt && ratio <= debt.ceiling ? 'debt' : 'fail';
}
