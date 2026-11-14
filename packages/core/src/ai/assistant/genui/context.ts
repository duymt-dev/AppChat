// Ngữ cảnh màn của lượt Trợ lý (REQ-E06, TIP-023c G2.6 + hợp đồng an toàn 8): `entity` / `id` / `selection` do trình duyệt gửi chỉ là
// GỢI Ý, không phải quyền. Trước khi vào prompt, server đọc lại từng id bằng chính action `<entity>.get` (cùng scope / quyền HIỆN HÀNH
// của người gọi — ra 404 / 403 thì bỏ) — bản ghi người dùng không được xem không lọt vào model, cũng không lộ là có tồn tại. Chỉ giữ id
// (không kéo nội dung bản ghi vào prompt — model tự gọi action đọc khi cần). Thực thể không có action get → bỏ entity / id / selection,
// chỉ giữ route. Đọc qua executor như mọi đọc của Trợ lý (audit nguồn assistant), không trừ credit.
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { AppError, type RecordIntentInput } from '@appchat/shared';
import { implementedBy, type ToolExecutor } from '../../../kernel/actions/executor';
import type { AssistantContext } from '../assistant-prompt';
import { assistantActionCtx } from '../meta-tools';
import type { AssistantTurnCtx } from '../types';
import { resolveRecord } from '../record-intent/context';

/** Số dòng chọn tối đa kiểm lại (FE gửi ≤ 50; prompt chỉ cần vài chục id). */
export const SELECTION_RESOLVE_MAX = 20;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const GETS = new Map(registry.filter((a) => a.risk === 'read' && a.id.endsWith('.get')).map((a) => [a.id.slice(0, -'.get'.length), a.id]));

/** Action get của thực thể màn (null khi không có / chưa cài). */
export const getterOf = (executor: ToolExecutor, entity: string | undefined): string | null => {
  const id = entity ? GETS.get(entity) : undefined;
  return id && implementedBy(executor)(id) ? id : null;
};

/** Người gọi đọc được bản ghi? Lỗi nghiệp vụ (404 / 403 / 422) → không; lỗi hệ thống ném tiếp. */
async function visible(executor: ToolExecutor, t: AssistantTurnCtx, actionId: string, entity: string, id: string): Promise<boolean> {
  try {
    const out = await executor.execute(assistantActionCtx(t, -1), actionId, { [`${entity}_id`]: id });
    return out.status === 200;
  } catch (e) {
    if (e instanceof AppError) return false;
    throw e;
  }
}

/** Ngữ cảnh đã lọc theo quyền hiện hành (route + surface giữ nguyên; entity / id / selection chỉ còn bản ghi xem được). */
export async function resolveContext(executor: ToolExecutor, t: AssistantTurnCtx, c: AssistantContext | undefined): Promise<AssistantContext | undefined> {
  if (!c) return c;
  const base: AssistantContext = { ...(c.route ? { route: c.route.slice(0, 300) } : {}), ...(c.surface ? { surface: c.surface } : {}) };
  const getter = getterOf(executor, c.entity);
  if (!getter || !c.entity) return base;
  const entity = c.entity;
  const ids = [...new Set([c.id, ...(c.selection ?? []).slice(0, SELECTION_RESOLVE_MAX)].filter((x): x is string => !!x && ID.test(x)))];
  const ok = new Set<string>();
  for (const id of ids) if (await visible(executor, t, getter, entity, id)) ok.add(id);
  const selection = (c.selection ?? []).filter((x) => ok.has(x)).slice(0, SELECTION_RESOLVE_MAX);
  return {
    ...base,
    entity,
    ...(c.id && ok.has(c.id) ? { id: c.id } : {}),
    ...(selection.length ? { selection } : {}),
  };
}

/**
 * Ngữ cảnh của lối vào theo bản ghi (TIP-023g §1.2–1.4): bản ghi người dùng BẤM (không phải dòng chọn chung của màn) đọc lại theo quyền
 * hiện hành — không đọc được → 404 / 403 (không âm thầm bỏ như gợi ý màn), để UI nói đúng. Chỉ id vào prompt.
 */
export async function resolveRecordTurnContext(d: { db: TenantDb; executor: ToolExecutor }, t: AssistantTurnCtx, ri: RecordIntentInput, route: string | undefined): Promise<AssistantContext> {
  const r = await resolveRecord(d, t, ri.entity, ri.entity_id);
  if (ri.displayed_version !== undefined && r.version !== null && r.version !== ri.displayed_version) throw new AppError('CONFLICT', 409, { record: 'version_changed' });
  return { ...(route ? { route: route.slice(0, 300) } : {}), surface: 'drawer', entity: r.entity, id: r.id };
}
