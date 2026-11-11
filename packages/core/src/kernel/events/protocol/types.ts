// Kiểu hợp đồng consumer v2 (TIP-003b §4.3): ba chế độ — `projection` (callback chỉ DB, biên nhận commit CÙNG transaction hiệu ứng),
// `action` (cổng admission riêng tư cho ActionExecutor — 003c cung cấp quyền hệ thống), `handoff` (ghi thao tác hạ nguồn bền + biên
// nhận cùng nhau; là "đã nhận", không phải "đã hoàn tất ngoài"). Callback trả `void` KHÔNG phải bằng chứng — phải trả kết cục có kiểu.
import type { TenantTx } from '../../actions/action-context';

export type ReceiptMode = 'projection' | 'action' | 'handoff';

/** Kết cục consumer khai — head chỉ tiến khi mọi consumer kỳ vọng ở applied / no_effect / handed_off. */
export type ConsumerOutcome =
  | { kind: 'applied'; effectRef?: string }
  | { kind: 'no_effect'; reason: string }
  | { kind: 'handed_off'; effectRef: string; completionRequired?: boolean }
  | { kind: 'blocked_unknown'; reason: string };

/** Event v2 đã nạp lại từ hàng có thẩm quyền (không từ job Redis). */
export interface DispatchedEvent {
  id: string;
  topic: string;
  workspaceId: string;
  aggregateKind: string;
  aggregateId: string;
  aggregateSeq: bigint;
  registryVersion: number;
  payload: Record<string, unknown>;
  traceId: string | null;
}

export interface ProjectionContract {
  name: string;
  mode: 'projection';
  contractVersion: number;
  topics: readonly string[];
  /** Chỉ ghi DB tenant trong `tx` (không mạng / provider). */
  apply(e: DispatchedEvent, tx: TenantTx): Promise<ConsumerOutcome>;
  /** TIP-006b: tối ưu sau commit (đẩy ý định vừa ghi — publish / đánh thức). Lỗi bị nuốt: ý định bền, quét khôi phục làm nốt. */
  after?(e: DispatchedEvent): Promise<void>;
}

/** Cổng action trung tính (§4.4): do dispatcher tin cậy sinh — không tuần tự hoá từ HTTP / tool. 003c nối ActionExecutor. */
export interface ActionPortBinding {
  eventId: string;
  consumer: string;
  actionId: string;
  inputDigest: string;
  aggregate: { kind: string; id: string };
  epoch: number;
  claimToken: string;
  fence: number;
}

export interface ActionContract {
  name: string;
  mode: 'action';
  contractVersion: number;
  topics: readonly string[];
  /** Id action duy nhất consumer được phép gọi. */
  actionId: string;
  /** Trả input (đã tất định) cho action — digest bất biến theo biên nhận. */
  input(e: DispatchedEvent): Record<string, unknown>;
  run(binding: ActionPortBinding, input: Record<string, unknown>, e: DispatchedEvent): Promise<ConsumerOutcome>;
}

export interface HandoffContract {
  name: string;
  mode: 'handoff';
  contractVersion: number;
  topics: readonly string[];
  /** Ghi thao tác hạ nguồn bền trong `tx` (cùng biên nhận) — trả tham chiếu đã nhận. */
  accept(e: DispatchedEvent, tx: TenantTx): Promise<ConsumerOutcome>;
  /** TIP-006b: tối ưu sau commit (như ProjectionContract.after). */
  after?(e: DispatchedEvent): Promise<void>;
}

export type EventContract = ProjectionContract | ActionContract | HandoffContract;

/** Dòng hợp đồng bất biến lưu ở event_registry_version (không có hàm). */
export interface ContractRow {
  consumer: string;
  mode: ReceiptMode;
  contract_version: number;
}

/** topic → danh sách hợp đồng; topic khai "không consumer" có mảng rỗng TƯỜNG MINH. */
export type RegistryTable = Record<string, ContractRow[]>;
