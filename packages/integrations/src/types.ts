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

export interface ConnectorManifest {
  key: string;
  port: PortKey;
  name: string;
  /** Key logo trong packages/ui. */
  logo: string;
  group: ConnectorGroup;
  status: ConnectorStatus;
  auth: { kind: 'api_key' | 'oauth2' | 'basic' | 'certificate'; fields?: z.ZodObject };
  webhooks?: boolean;
  modes: Array<'sandbox' | 'live'>;
  docsUrl?: string;
}

/** Adapter cụ thể implement interface port (ports/<port>.ts — TIP chủ port định nghĩa). */
export interface ConnectorAdapter {
  manifest: ConnectorManifest;
}

export interface ConnectorEntry {
  manifest: ConnectorManifest;
  adapter?: ConnectorAdapter;
}
