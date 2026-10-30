// Connector chưa có adapter — thẻ "Sắp có" + "Đăng ký quan tâm" (D28; danh sách theo prototype Nền tảng kết nối).
import type { ConnectorGroup, ConnectorManifest, PortKey } from './types';

type Soon = [key: string, name: string, port: PortKey, group: ConnectorGroup, color: string];

const SOON: Soon[] = [
  ['mailgun', 'Mailgun', 'mail', 'marketing', '#C02021'],
  ['kiotviet', 'KiotViet', 'commerce_sync', 'commerce', '#1763F4'],
  ['sapo', 'Sapo', 'commerce_sync', 'commerce', '#1565C0'],
  ['haravan', 'Haravan', 'commerce_sync', 'commerce', '#0066FF'],
  ['woocommerce', 'WooCommerce', 'commerce_sync', 'commerce', '#7F54B3'],
  ['google_sheets', 'Google Sheets', 'sheet_sync', 'productivity', '#0F9D58'],
  ['gcs', 'Google Cloud Storage', 'storage', 'productivity', '#4285F4'],
  ['misa_meinvoice', 'MISA meInvoice', 'einvoice', 'erp', '#E2231A'],
  ['matbao_minvoice', 'Mắt Bão M-Invoice', 'einvoice', 'erp', '#D71920'],
  ['vnpt_invoice', 'VNPT Invoice', 'einvoice', 'erp', '#0068B7'],
  ['viettel_sinvoice', 'Viettel S-Invoice', 'einvoice', 'erp', '#EE0033'],
  ['odoo', 'Odoo', 'accounting_sync', 'erp', '#714B67'],
  ['fast', 'Fast', 'accounting_sync', 'erp', '#E8602C'],
];

export const comingSoonConnectors: ConnectorManifest[] = SOON.map(([key, name, port, group, color]) => ({
  key,
  port,
  name,
  logo: key,
  color,
  group,
  status: 'coming_soon',
  auth: { kind: 'api_key', fields: [] },
  modes: ['live'],
}));
