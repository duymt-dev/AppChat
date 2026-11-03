// Kiểu dữ liệu Trợ lý AI (Blueprint §4.4 assistant / ai, §4.5).
import type { UiCommand } from '@appchat/actions';
import type { ActionPreviewDto, AiTaskRowDto, AiTasksPayloadDto, GenUiPart } from '@appchat/shared';
export type Tier = 'standard' | 'advanced' | 'max';
export type Mode = 'chat' | 'cowork';

export interface ThinkCard {
  label: string;
  desc: string;
  color: string;
  icon: string;
  tag: string;
  command: string;
}

export interface CoworkCard {
  id: string;
  name: string;
  desc: string;
  model_tier: Tier;
  status: 'active' | 'paused';
  color: string;
  icon: string;
}

export interface AssistantHome {
  think_cards: ThinkCard[];
  cowork_cards: CoworkCard[];
  prompts: string[];
}

export interface ConfirmEvent {
  type: 'confirm';
  confirm_token: string;
  key: string;
  icon: string;
  color: string;
  action_id: string;
  route: string;
  title: string;
  desc: string;
  dest: string;
  /** ActionPreview chuẩn của backend (`changes` trước / sau) — thẻ hiện đổi gì (TIP-023b R2.8). */
  preview?: ActionPreview;
  /** Input đã chuẩn hoá (đã bỏ ô bí mật) — form Sửa điền sẵn (REQ-E03b). */
  input?: Record<string, unknown>;
  /** Khuôn input lồng nhau — form Sửa giữ kiểu object / array / enum. */
  schema?: Record<string, unknown>;
}

export type ActionPreview = ActionPreviewDto;

export type TurnEvent =
  | { type: 'delta'; text: string }
  | ConfirmEvent
  | { type: 'ui_command'; command: UiCommand }
  | { type: 'result'; action_log_id: string; summary: string }
  | { type: 'error'; code: string; message: string }
  | GenUiPart;

/** Ngữ cảnh màn đang mở gửi kèm lượt (Blueprint §4.5 `context`). */
export interface TurnContext {
  route: string;
  entity?: string;
  id?: string;
  selection?: string[];
  /** Khung hiện câu trả lời (D55 §9): drawer theo màn → cây gọn; màn Trợ lý → đầy đủ. */
  surface?: 'drawer' | 'assistant';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  card?: ConfirmEvent;
  /** `approval`: đã xác nhận nhưng thao tác chuyển sang chờ duyệt — chưa thực hiện. */
  status?: 'pending' | 'done' | 'cancelled' | 'approval';
  /** Bản ghi vừa tạo khi xác nhận (ui_target của action) — nút "Đã lưu vào …" mở đúng chỗ. */
  target?: UiCommand;
  /** Cây GenUI của lượt (TIP-023c) — chỉ cây + refs đã lọc + intent; ô bí mật không bao giờ nằm ở đây. */
  ui?: GenUiPart;
}

/** Tác vụ tự chủ + màn Coworks — cùng shape `GET /v1/ai-tasks` (packages/shared/src/api/ai-tasks.ts, TIP-035). */
export type AiTask = AiTaskRowDto;
export type AiTasksPayload = AiTasksPayloadDto;
export type TaskStat = AiTasksPayloadDto['stats'][number];

export type LogKind = 'create' | 'update' | 'send' | 'export' | 'delete';

export interface ActionLogRow {
  id: string;
  kind: LogKind;
  title?: string;
  object?: string;
  day: string;
  time: string;
  undoable: boolean;
  status: 'done' | 'pending';
  action_id: string;
  undone?: boolean;
}

export interface Run {
  id: string;
  root_run_id: string;
  task: string;
  agent: string;
  meta: string;
  pct: number;
  status: 'running' | 'waiting_approval' | 'done';
  approval_id?: string;
}

export interface ApprovalRow {
  id: string;
  action_id: string;
  risk: string;
  permission: string;
  agent: string;
  title: string;
  summary: string;
  reason: string;
  day: string;
  time: string;
  status: 'pending' | 'approved' | 'edited' | 'rejected' | 'expired';
  can_decide: boolean;
  /** Input agent xin chạy + trường sửa được (nút "Sửa & duyệt"). */
  input: Record<string, unknown>;
  fields: { key: string; type: 'string' | 'number' | 'boolean'; required: boolean }[];
  note?: string;
}
