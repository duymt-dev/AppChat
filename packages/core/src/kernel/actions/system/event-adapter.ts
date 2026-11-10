// Adapter action-mode của giao thức sự kiện v2 cho action riêng (TIP-003c §4.2, 003b §4.4): dispatcher tin cậy dựng binding, `run` gọi
// `runSystemAction` với trigger tất định từ event đã nạp lại (không từ HTTP / job Redis). Fanout có giới hạn (vd. phản hồi đầu cho mọi
// ticket chưa phản hồi) → mỗi mục tiêu một biên nhận trigger. Kết cục có kiểu: applied nếu có hiệu ứng mới, handed_off khi việc nền /
// thao tác nền tảng đã nhận (202), còn lại no_effect. Hợp đồng singleton theo tên (nhiều app Nest một tiến trình gắn deps mới nhất).
import type { TenantDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { frozenEventRegistry, registerEventContract } from '../../events/protocol/registry';
import type { ActionContract, ConsumerOutcome, DispatchedEvent } from '../../events/protocol/types';
import type { ActionExecutor } from '../executor';
import { runSystemAction, type SystemTrigger } from './admission';

export interface SystemAdapterDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  tenants: Pick<TenantDbResolver, 'get'> | null;
}

export interface SystemAdapterSpec {
  name: string;
  topics: readonly string[];
  /** Action riêng được gọi (binding); `also` = action cùng họ cho topic khác của cùng consumer. */
  actionId: string;
  also?: readonly string[];
  /** Trigger tất định từ event (đọc DB tenant nếu cần chọn mục tiêu); rỗng = event không áp dụng. */
  triggers(e: DispatchedEvent, db: TenantDb | null): SystemTrigger[] | Promise<SystemTrigger[]>;
}

const bound = new Map<string, { contract: ActionContract; deps: SystemAdapterDeps | null }>();

type Out = { status: number; data: unknown };

function outcomeOf(rs: Out[]): ConsumerOutcome {
  const refs: string[] = [];
  let handed: string | null = null;
  let reason = 'not_applicable';
  for (const r of rs) {
    if (r.status === 202) {
      const d = r.data as { operation_id?: string; job_id?: string; action_log_id?: string };
      handed = d.operation_id ?? d.job_id ?? d.action_log_id ?? 'accepted';
      continue;
    }
    const res = (r.data as { result?: { disposition?: string; effect_ref?: string; reason_code?: string; operation_id?: string; status?: string } }).result;
    if (res?.disposition === 'handed_off') handed = res.effect_ref ?? res.operation_id ?? 'handed_off';
    else if (res?.disposition === 'no_effect') reason = res.reason_code ?? 'no_effect';
    else refs.push(res?.effect_ref ?? res?.operation_id ?? 'applied');
  }
  if (handed) return { kind: 'handed_off', effectRef: handed };
  if (refs.length) return { kind: 'applied', effectRef: refs.slice(0, 5).join(',').slice(0, 200) };
  return { kind: 'no_effect', reason };
}

/** Đăng ký (một lần / tên) hoặc gắn lại deps cho hợp đồng action-mode. Registry đã đóng băng → chỉ gắn deps. */
export function registerSystemAdapter(spec: SystemAdapterSpec, deps: SystemAdapterDeps): ActionContract {
  const cur = bound.get(spec.name);
  if (cur) {
    cur.deps = deps;
    return cur.contract;
  }
  const allowed = new Set([spec.actionId, ...(spec.also ?? [])]);
  const slot: { contract: ActionContract; deps: SystemAdapterDeps | null } = { contract: null as unknown as ActionContract, deps };
  slot.contract = {
    name: spec.name,
    mode: 'action',
    contractVersion: 1,
    topics: spec.topics,
    actionId: spec.actionId,
    // Digest ghim theo danh tính event (bất biến); mục tiêu do `run` chọn lại theo trạng thái hiện tại dưới biên nhận trigger.
    input: (e) => ({ event_id: e.id, topic: e.topic }),
    async run(_binding, _input, e) {
      const d = slot.deps;
      if (!d) throw new Error(`adapter ${spec.name}: chưa gắn executor`);
      const db = d.tenants ? await d.tenants.get(TenantContexts.system(e.workspaceId, `system-adapter:${spec.name}`)) : null;
      const ts = await spec.triggers(e, db);
      const outs: Out[] = [];
      for (const t of ts) {
        if (!allowed.has(t.actionId)) throw new Error(`adapter ${spec.name}: action ngoài hợp đồng ${t.actionId}`);
        outs.push(await runSystemAction(d.executor, d.tenants, t));
      }
      return outcomeOf(outs);
    },
  };
  bound.set(spec.name, slot);
  if (!frozenEventRegistry()) registerEventContract(slot.contract);
  return slot.contract;
}

/** Chỉ test. */
export const resetSystemAdaptersForTest = (): void => bound.clear();
