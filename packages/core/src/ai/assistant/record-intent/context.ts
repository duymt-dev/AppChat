// Đọc lại bản ghi của lối vào theo bản ghi (TIP-023g §1.2): bằng action đọc chuẩn của domain qua executor với ngữ cảnh Trợ lý của người
// gọi (quyền + scope + chiếu trường HIỆN HÀNH) — thiếu / ngoài scope / đã xoá / bị ẩn → 404 đồng nhất (403 thiếu quyền nền giữ nguyên
// envelope). Việc follow đọc qua facade insights (scope crm, còn mở). Chỉ trả tham chiếu tối thiểu (loại / id / mã / phiên bản / tiêu đề
// hiển thị) — tiêu đề là dữ liệu không tin cậy, không bao giờ là lệnh. Không kéo hồ sơ 360 của khách theo liên kết.
import type { TenantDb } from '@appchat/db';
import { AppError, type RecordEntity } from '@appchat/shared';
import type { ToolExecutor } from '../../../kernel/actions/executor';
// File dịch vụ trực tiếp (không qua facade insights/public — facade kéo cả module jobs / export, tạo vòng import với Trợ lý).
import { visibleFollowUp } from '../../../insights/services/follow-ups';
import { assistantActionCtx } from '../meta-tools';
import type { AssistantTurnCtx } from '../types';
import { RECORD_ENTITY_DEFS } from './registry';

export interface RecordRef {
  entity: RecordEntity;
  id: string;
  code: string | null;
  version: number | null;
  /** Tên / tiêu đề hiển thị (đã cắt) — dữ liệu, không phải chỉ dẫn. */
  label: string;
  /** Kết quả đọc của getter (đã chiếu theo quyền) — chỉ dùng phía server (sự kiện sản phẩm cho đề xuất), không vào ai_run.input. */
  record: Record<string, unknown>;
}

const NOT_FOUND = () => new AppError('NOT_FOUND', 404, { record: 'not_found' });
const str = (v: unknown) => (typeof v === 'string' ? v : null);
const clip = (s: string | null) => (s ?? '').replace(/[\u0000-\u001f[\]<>]/g, ' ').slice(0, 120);

function refOf(entity: RecordEntity, id: string, r: Record<string, unknown>): RecordRef {
  const label = str(r.title) ?? str(r.name) ?? str(r.contact_name) ?? str(r.customer_name) ?? str(r.service_name) ?? '';
  return { entity, id, code: str(r.code), version: typeof r.version === 'number' ? r.version : null, label: clip(label), record: r };
}

/** Bản ghi người gọi đọc được ngay lúc này — không thì 404 (hoặc 403 thiếu quyền nền). Lỗi hệ thống ném tiếp. */
export async function resolveRecord(d: { db: TenantDb; executor: ToolExecutor }, t: AssistantTurnCtx, entity: RecordEntity, id: string): Promise<RecordRef> {
  const def = RECORD_ENTITY_DEFS[entity];
  if (!def.getter) {
    const f = await d.db.$transaction((tx) => visibleFollowUp(tx as never, t.authz, id));
    if (!f) throw NOT_FOUND();
    return { entity, id, code: null, version: f.version, label: clip(f.name), record: { id: f.id, contact_id: f.contact_id, due_at: f.due_at, version: f.version, stage: f.stage } };
  }
  let out;
  try {
    out = await d.executor.execute<Record<string, unknown>>(assistantActionCtx(t, -1), def.getter, { [def.idKey]: id });
  } catch (e) {
    if (e instanceof AppError && e.httpStatus === 403 && e.code === 'FORBIDDEN') throw e;
    if (e instanceof AppError && e.httpStatus < 500) throw NOT_FOUND();
    throw e;
  }
  if (out.status !== 200) throw NOT_FOUND();
  const r = (out.data.result ?? {}) as Record<string, unknown>;
  return refOf(entity, id, r);
}
