// VietQR tra MST (OQ-05, miễn phí): GET https://api.vietqr.io/v2/business/:taxCode → { code: '00', data: { name, address, … } }.
// VietQR chỉ trả tên + địa chỉ (+ tên quốc tế / viết tắt); trường khác để trống cho người dùng nhập tay.
import { normalizeTaxCode, type TaxLookupProvider, type TaxLookupResult } from '../../ports/tax-lookup';

interface VietQrBody {
  code?: string;
  data?: { id?: string; name?: string; address?: string; status?: string } | null;
}

export class VietQrTaxLookupProvider implements TaxLookupProvider {
  readonly key = 'vietqr';
  constructor(private readonly o: { fetch?: typeof fetch; timeoutMs?: number; baseUrl?: string } = {}) {}

  async lookup(taxCode: string): Promise<TaxLookupResult | null> {
    const code = normalizeTaxCode(taxCode);
    if (!code) return null;
    try {
      const res = await (this.o.fetch ?? fetch)(`${this.o.baseUrl ?? 'https://api.vietqr.io'}/v2/business/${code}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(this.o.timeoutMs ?? 5_000),
      });
      if (!res.ok) return null;
      const body = (await res.json()) as VietQrBody;
      if (body.code !== '00' || !body.data?.name) return null;
      return {
        legal_name: body.data.name,
        address: body.data.address ?? '',
        representative: '',
        phone: '',
        founded_on: '',
        legal_status: body.data.status ?? '',
      };
    } catch {
      return null; // timeout / mạng lỗi → nhập tay (D35)
    }
  }
}
