// Kiểu dữ liệu Trợ lý AI (Blueprint §4.4 assistant / ai, §4.5).
import type { UiCommand } from '@appchat/actions';
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
}

export type TurnEvent =
  | { type: 'delta'; text: string }
  | ConfirmEvent
  | { type: 'ui_command'; command: UiCommand }
  | { type: 'result'; action_log_id: string; summary: string }
  | { type: 'error'; code: string; message: string };

/** Ngữ cảnh màn đang mở gửi kèm lượt (Blueprint §4.5 `context`). */
export interface TurnContext {
  route: string;
  entity?: string;
  id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  card?: ConfirmEvent;
  status?: 'pending' | 'done' | 'cancelled';
  /** Bản ghi vừa tạo khi xác nhận (ui_target của action) — nút "Đã lưu vào …" mở đúng chỗ. */
  target?: UiCommand;
}

export interface AiTask {
  id: string;
  name: string;
  role: string;
  runs: number;
  success: string;
  cost: string;
  active: boolean;
  model_tier: Tier;
  department: string;
  channels: string[];
  conf: number;
  prompt?: string;
}

export interface TaskStat {
  key: string;
  color: string;
  icon: string;
  value: string;
}

export interface AiTasksPayload {
  tasks: AiTask[];
  stats: TaskStat[];
  templates: { label: string; name: string; goal: string; department: string }[];
  departments: { key: string; bg: string; fg: string }[];
  data_options: string[];
  tool_options: string[];
  drawer: {
    prompt: string;
    tokens: string;
    tools: { label: string; on: boolean }[];
    knowledge: { label: string; meta: string; on: boolean }[];
    logs: { time: string; text: string; color: string }[];
  };
}

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
