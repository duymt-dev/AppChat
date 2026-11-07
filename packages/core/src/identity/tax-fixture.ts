// Bảng MST mẫu cho TaxLookupProvider `mock` — cùng dữ liệu fixture prototype (fixtures/prototype-parity/auth.json → tax_lookup).
import type { TaxLookupResult } from '@appchat/integrations';

export const TAX_FIXTURE: Record<string, TaxLookupResult> = {
  "0312345678": {
    "legal_name": "CÔNG TY TNHH MEDIASOFT VIỆT NAM",
    "address": "Số 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    "representative": "Mai Đình Ngọc",
    "phone": "0907711888",
    "founded_on": "12/03/2017",
    "legal_status": "Đang hoạt động"
  }
};
