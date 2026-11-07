// Port `tax_lookup` (provider-ports §1, D35): tra MST khi khai báo DN. Không thấy / provider lỗi → null, UI cho nhập tay.
export interface TaxLookupResult {
  legal_name: string;
  address: string;
  representative: string;
  phone: string;
  founded_on: string;
  legal_status: string;
}

export interface TaxLookupProvider {
  readonly key: string;
  lookup(taxCode: string): Promise<TaxLookupResult | null>;
}

/** MST 10 số hoặc 13 số (chi nhánh, có / không gạch nối). */
export const normalizeTaxCode = (raw: string): string | null => {
  const d = raw.replace(/[\s-]/g, '');
  return /^\d{10}(\d{3})?$/.test(d) ? d : null;
};
