// Ràng buộc "đã khoá họ khách" cho quy tắc giai đoạn tự động (TIP-015g §1.2): producer chứng từ (gửi / từ chối / hết hạn báo giá, gửi /
// ký hợp đồng, hoàn tất đơn) khoá họ khách CHUẨN (gốc còn sống + nguồn đã gộp, id tăng dần) TRƯỚC khi khoá báo giá / hợp đồng / đơn —
// `lockStageFamily*` (crm/lifecycle/lock.ts) ghi ràng buộc gắn đúng transaction đang chạy. `applyStageRule` chỉ chạy khi thấy ràng buộc
// của chính transaction đó (không tin cờ / JSON người gọi), thiếu → từ chối thay vì tự khoá khách SAU chứng từ (đảo thứ tự khoá).
import { AppError } from '@appchat/shared';

export interface StageFamilyBinding {
  /** Gốc chuẩn còn sống của họ (null = gốc đã xoá / chuỗi gộp hỏng → không đổi giai đoạn, chứng từ vẫn chuyển). */
  rootId: string | null;
  /** Mọi khách đã khoá trong họ (id tăng dần). */
  ids: string[];
}

const bindings = new WeakMap<object, StageFamilyBinding[]>();

export function bindStageFamily(tx: object, b: StageFamilyBinding): StageFamilyBinding {
  const list = bindings.get(tx) ?? [];
  list.push(b);
  bindings.set(tx, list);
  return b;
}

/** Ràng buộc của transaction này phủ `contactId` (khách lưu trên chứng từ — có thể là nguồn đã gộp). Không có → 500 (lỗi lập trình). */
export function stageBinding(tx: object, contactId: string): StageFamilyBinding {
  const b = bindings.get(tx)?.find((x) => x.ids.includes(contactId));
  if (!b) throw new AppError('INTERNAL', 500, { stage: 'family_unlocked' });
  return b;
}

export type AutoStage = 'lead' | 'potential' | 'consulting' | 'quote' | 'contract' | 'won' | 'lost';
