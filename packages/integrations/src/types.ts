// Hợp đồng connector (standards/integrations/provider-ports.md → Hợp đồng). Core chỉ biết port, không biết tên hãng.
import type { z } from 'zod';

export const PORT_KEYS = [
  'bank_feed',
  'einvoice',
  'esign',
  'tax_lookup',
  'mail',
  'storage',
  'llm',
  'accounting_sync',
  'commerce_sync',
  'order_sync',
  'sheet_sync',
  'sms',
] as const;
export type PortKey = (typeof PORT_KEYS)[number];

export type ConnectorGroup = 'channels_studio' | 'marketing' | 'crm' | 'commerce' | 'payments' | 'productivity' | 'erp';
export type ConnectorStatus = 'ga' | 'beta' | 'coming_soon';

/** Trường form kết nối (thứ tự = form FE). `secret` → mã hoá vào `secret_enc`, không trả về API (DC-042). */
export interface AuthField {
  key: string;
  secret?: boolean;
  optional?: boolean;
}

export interface ConnectorManifest {
  key: string;
  port: PortKey;
  name: string;
  /** Key logo trong packages/ui. */
  logo: string;
  /** Màu thương hiệu của thẻ (prototype Nền tảng kết nối). */
  color: string;
  group: ConnectorGroup;
  status: ConnectorStatus;
  auth: { kind: 'api_key' | 'oauth2' | 'basic' | 'certificate'; fields: AuthField[]; schema?: z.ZodObject };
  webhooks?: boolean;
  modes: Array<'sandbox' | 'live'>;
  docsUrl?: string;
  /** Connector sandbox / test (provider-ports §9) — kết nối được qua action nhưng không hiện ở trang Nền tảng kết nối. */
  hidden?: boolean;
  /** Kiểm chéo trường sau khi tách (TIP-012b §1.2: tài khoản nhận, "ít nhất một cách xác thực") → lỗi theo trường, null = hợp lệ. */
  validate?(v: { config: Record<string, string>; secrets: Record<string, string> }): Record<string, string> | null;
}

export type ConnectionMode = 'sandbox' | 'live';

/** Kết nối của workspace mà adapter nhận (bí mật đã giải mã — chỉ trong bộ nhớ, không log). */
export interface ConnectionCtx {
  id: string;
  mode: ConnectionMode;
  config: Record<string, string>;
  secrets: Record<string, string>;
}

export interface WebhookRequest {
  headers: Record<string, string | undefined>;
  rawBody: string;
}

/** Sự kiện thô đã xác thực — `id` của provider làm khoá idempotent (provider-ports §6). */
export interface WebhookEvent {
  id: string;
  kind: string;
  payload: unknown;
}

/** Adapter cụ thể implement interface port (ports/<port>.ts — TIP chủ port định nghĩa). */
export interface ConnectorAdapter {
  manifest: ConnectorManifest;
  /** Kiểm thông tin đăng nhập trước khi lưu kết nối; lỗi → ném. */
  test?(conn: ConnectionCtx): Promise<void>;
  /** Kiểm chữ ký webhook (trong adapter — provider-ports §6); sai → null. */
  verifyWebhook?(conn: ConnectionCtx, req: WebhookRequest): WebhookEvent | null;
}

/**
 * Adapter theo chế độ (TIP-012b §1.1): `live` = adapter thật của provider, `sandbox` = adapter giả lập chỉ cho test / dev (ẩn). Tra bằng
 * `adapterFor(entry, mode)` — KHÔNG có đường lùi live → sandbox; thiếu adapter của chế độ đó = chưa hỗ trợ.
 */
export interface ConnectorEntry {
  manifest: ConnectorManifest;
  adapters?: Partial<Record<ConnectionMode, ConnectorAdapter>>;
}
