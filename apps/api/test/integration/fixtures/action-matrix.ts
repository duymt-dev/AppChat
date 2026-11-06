// Mục lục ma trận theo action (TIP-023b SPEC B.3): mỗi action trong registry ↔ đúng một file `actions/<id>.action.test.ts` (khung chung ở
// `helpers/action-matrix.ts`, seed cục bộ trong từng file). Action thuộc TIP sau (handler còn NotImplementedHandler) ghi TIP chủ — TIP đó
// thêm file ma trận khi cài handler; không có ô "bỏ qua" nào khác. Đây là chỉ mục, không phải bộ test.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { registry } from '@appchat/actions';
import { tipOwnerOf } from '@appchat/core';

export const MATRIX_DIR = join(import.meta.dirname, '..', 'actions');
/** TIP chưa làm tới trong GOAL-RELEASE (sau 023b) — action của chúng chưa có handler nên chưa có ma trận. */
export const LATER_TIPS: ReadonlySet<string> = new Set(['036', '038', '039', '040', '041', '043', '044', '045', '046']);

export type MatrixEntry = { id: string; file: string } | { id: string; pendingTip: string };

export function matrixIndex(): MatrixEntry[] {
  const files = new Set(readdirSync(MATRIX_DIR).filter((f) => f.endsWith('.action.test.ts')));
  return registry.map((d) => {
    const file = `${d.id}.action.test.ts`;
    if (files.has(file)) return { id: d.id, file };
    return { id: d.id, pendingTip: tipOwnerOf(d.id) ?? '?' };
  });
}

/** File ma trận không ứng với action nào trong registry (đổi tên / xoá action mà quên file). */
export function orphanMatrixFiles(): string[] {
  const ids = new Set(registry.map((d) => d.id));
  return readdirSync(MATRIX_DIR)
    .filter((f) => f.endsWith('.action.test.ts'))
    .filter((f) => !ids.has(f.replace(/\.action\.test\.ts$/, '')));
}
