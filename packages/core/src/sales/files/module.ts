// Đăng ký tệp đính kèm bản ghi bán hàng (TIP-032d) — SalesModule chỉ thêm 2 dòng: handler 6 action + nguồn tệp vào registry kernel.
import { registerRecordFileSource } from '../../kernel/files/file-claims';
import { ORDER_FILE_HANDLERS } from '../orders/files/handlers';
import { orderFileSource } from '../orders/files/source';
import { INVOICE_FILE_HANDLERS } from '../payments/files/handlers';
import { invoiceFileSource } from '../payments/files/source';

export const COMMERCE_FILE_HANDLERS = [...ORDER_FILE_HANDLERS, ...INVOICE_FILE_HANDLERS] as const;

export function registerCommerceFileSources(): void {
  registerRecordFileSource(orderFileSource);
  registerRecordFileSource(invoiceFileSource);
}
