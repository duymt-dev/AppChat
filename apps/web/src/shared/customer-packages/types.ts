// Liệu trình của khách — kiểu dùng chung (TIP-033b §4.4) lấy từ DTO shared.
import type { CustomerPackageItem } from '@appchat/shared';

export type CustomerPackage = CustomerPackageItem;
export interface CustomerPackagesPage {
  data: CustomerPackage[];
  next_cursor: string | null;
}
