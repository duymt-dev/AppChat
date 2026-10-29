// ActionDef (Blueprint §3.1, standards/actions/action-registry.md). Chỉ schema + metadata — handler ở packages/core.
import type { z } from 'zod';
import type { PermissionKey } from '@appchat/shared';

export type Risk = 'read' | 'write' | 'send' | 'money' | 'delete' | 'config';
export type Permission = PermissionKey | 'platform_admin' | 'self';

export type ModuleKey =
  | 'identity' | 'settings' | 'channels' | 'inbox' | 'crm' | 'catalog' | 'sales' | 'documents'
  | 'booking' | 'support' | 'marketing' | 'loyalty' | 'ai' | 'billing' | 'integrations' | 'notifications';

export type UiCommand =
  | { type: 'navigate'; route: string }
  | { type: 'open'; entity: string; id: string; view?: 'drawer' | 'page' }
  | { type: 'prefill'; form: string; values: Record<string, unknown> }
  | { type: 'filter'; table: string; filter: Record<string, unknown> }
  | { type: 'highlight'; target: string };

export interface ActionDef<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  module: ModuleKey;
  /** i18n key `actions.<id>.title` */
  title: string;
  /** English, written for the LLM tool catalogue. */
  description: string;
  input: I;
  output: O;
  permission: Permission;
  risk: Risk;
  bulk?: boolean;
  agentGrantable: boolean;
  /** Nhóm "Kỹ năng AI" trong Builder Tools — chỉ action đọc (risk 'read') hữu ích cho AI trực kênh (D51). */
  skill?: boolean;
  /** Key connector/channel cần kết nối để tool chạy được — Builder hiện badge "Cần kết nối X" (D51 §3.3b). */
  requiresConnector?: string;
  undo?: { windowSec: number };
  invalidates: string[];
  db?: 'platform';
  uiTarget?: (o: z.infer<O>) => UiCommand;
}

export const defineAction = <I extends z.ZodTypeAny, O extends z.ZodTypeAny>(d: ActionDef<I, O>): ActionDef<I, O> => d;

export type ActionInput<D> = D extends ActionDef<infer I, z.ZodTypeAny> ? z.input<I> : never;
export type ActionOutput<D> = D extends ActionDef<z.ZodTypeAny, infer O> ? z.output<O> : never;

/** Kết quả thống nhất của POST /v1/actions/:id (Blueprint §4.3). */
export interface ActionResult<O = unknown> {
  result: O;
  action_log_id: string;
  undo_until?: string;
  ui_target?: UiCommand;
}

export interface ActionPreview {
  summary: string;
  risk: Risk;
  count?: number;
  changes?: { entity: string; id?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }[];
  warnings?: string[];
}

/** 202 của POST /v1/actions/:id (Blueprint §4.3). */
export type ActionAccepted =
  | { status: 'preview_required'; preview: ActionPreview; confirm_token: string; expires_at: string }
  | { status: 'approval_required'; approval_id: string };
