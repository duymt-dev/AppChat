// TaxLookupProvider `mock` (provider-ports §9): dữ liệu cố định cho dev / test, giống prototype (MST hợp lệ nào cũng ra mẫu).
import { normalizeTaxCode, type TaxLookupProvider, type TaxLookupResult } from '../../ports/tax-lookup';

export class MockTaxLookupProvider implements TaxLookupProvider {
  readonly key = 'mock';
  constructor(
    private readonly rows: Record<string, TaxLookupResult>,
    /** MST không có trong bảng → trả mẫu đầu (hành vi prototype) hay null. */
    private readonly fallbackFirst = false,
  ) {}

  async lookup(taxCode: string): Promise<TaxLookupResult | null> {
    const code = normalizeTaxCode(taxCode);
    if (!code) return null;
    return this.rows[code] ?? (this.fallbackFirst ? (Object.values(this.rows)[0] ?? null) : null);
  }
}
