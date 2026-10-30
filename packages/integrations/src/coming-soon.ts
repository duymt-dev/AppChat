// Connector chưa có adapter — thẻ "Sắp có" + "Đăng ký quan tâm" (D28; danh sách theo prototype Nền tảng kết nối).
import type { ConnectorGroup, ConnectorManifest, PortKey } from './types';

type Soon = [key: string, name: string, port: PortKey, group: ConnectorGroup];

const SOON: Soon[] = [
  ['mailgun', 'Mailgun', 'mail', 'marketing'],
  ['kiotviet', 'KiotViet', 'commerce_sync', 'commerce'],
  ['sapo', 'Sapo', 'commerce_sync', 'commerce'],
  ['haravan', 'Haravan', 'commerce_sync', 'commerce'],
  ['woocommerce', 'WooCommerce', 'commerce_sync', 'commerce'],
  ['google_sheets', 'Google Sheets', 'sheet_sync', 'productivity'],
  ['gcs', 'Google Cloud Storage', 'storage', 'productivity'],
  ['misa_meinvoice', 'MISA meInvoice', 'einvoice', 'erp'],
  ['matbao_minvoice', 'Mắt Bão M-Invoice', 'einvoice', 'erp'],
  ['vnpt_invoice', 'VNPT Invoice', 'einvoice', 'erp'],
  ['viettel_sinvoice', 'Viettel S-Invoice', 'einvoice', 'erp'],
  ['odoo', 'Odoo', 'accounting_sync', 'erp'],
  ['fast', 'Fast', 'accounting_sync', 'erp'],
];

export const comingSoonConnectors: ConnectorManifest[] = SOON.map(([key, name, port, group]) => ({
  key,
  port,
  name,
  logo: key,
  group,
  status: 'coming_soon',
  auth: { kind: 'api_key' },
  modes: ['live'],
}));
