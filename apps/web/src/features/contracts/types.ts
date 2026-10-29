// Kiểu dữ liệu Hợp đồng — khớp response mock / API Blueprint §4.4 contracts (COMMERCE-DECISIONS §9).
export type ContractStatus =
  'draft' | 'pending_approval' | 'pending_signature' | 'signed' | 'declined' | 'expired' | 'terminated';
export type ContractKind = 'service' | 'sale' | 'framework';
/** Chip lọc / cột kanban (4 cột prototype; "Chờ duyệt" gộp vào Nháp). */
export type ContractChip = 'all' | 'signed' | 'pending' | 'draft' | 'expired';

export interface SignEvent {
  type: string;
  at: string;
  actor: string;
  ip?: string;
  doc_sha256?: string;
}

export interface Contract {
  id: string;
  code: string;
  number: string;
  kind: ContractKind;
  contact_id: string;
  contact_name: string;
  phone: string;
  quote_id: string | null;
  quote_code: string;
  title: string;
  value: string;
  signed_date: string;
  start_date: string | null;
  end_date: string | null;
  owner_user_id: string;
  owner_name: string;
  status: ContractStatus;
  created_at: string;
  sent_at: string | null;
  signed_by_customer_at: string | null;
  sign_token: string | null;
  sign_link_expires_at: string | null;
  signed_sha256: string | null;
  renewal_of_id: string | null;
  terminated_reason: string;
  note: string;
  file_name: string;
  events: SignEvent[];
  ai: { hint: string; wait: boolean };
}

export interface ContractFilter {
  status: ContractChip;
  owner_id: string;
  value: string;
  q: string;
}

export interface ContractsMeta {
  counts: Record<string, number>;
  stats: { total: number; signed: number; pending: number; active_value: string };
  crm: {
    ltv: string;
    total: number;
    tier: string;
    debt: string;
    others: { code: string; title: string; value: string }[];
  };
  insight: string;
  suggestions: string[];
  files: { name: string; ext: string; by: string; at: string; size: string }[];
  ai_runs: Record<string, string>;
}

/** GET /public/sign/:token — thông tin hiển thị cho khách (không lộ dữ liệu nội bộ). */
export interface SignView {
  code: string;
  title: string;
  kind: ContractKind;
  value: string;
  start_date: string | null;
  end_date: string | null;
  customer: { name: string; phone: string };
  business: { name: string; signed: boolean };
  status: ContractStatus;
  expires_at: string | null;
  signed_at: string | null;
  sha256: string | null;
  otp_left: number;
  certificate: SignEvent[];
}
