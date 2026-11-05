// Kiểu chung của quyền theo trường (TIP-045b annex C).
import type { CustomFieldDef, CustomFieldEntity } from '@appchat/shared';

/** Quyền trường hiệu lực của một người xem cho một entity: tập key tuỳ biến được thấy + trường hệ thống bị ẩn. */
export interface FieldView {
  entity: CustomFieldEntity;
  /** Vai trò trường (`owner` / vai trò membership / `agent`). */
  role: string;
  /** Key tuỳ biến được đọc (định nghĩa còn hiệu lực ∩ vai trò). */
  custom: ReadonlySet<string>;
  /** Mọi key tuỳ biến còn hiệu lực (để phân biệt "ẩn" với "không tồn tại"). */
  known: ReadonlySet<string>;
  /** Trường hệ thống / dẫn xuất bị ẩn với người xem này (vd. `cost`). */
  hiddenSystem: ReadonlySet<string>;
  /** Phiên bản định nghĩa (cache key). */
  version: string;
}

export type FieldDefs = Pick<CustomFieldDef, 'key' | 'roles' | 'ai' | 'sys'>[];
