// Ảnh chụp giá / quyền lợi trên hoá đơn gói (TIP-039, DC-242): ghi lúc tạo hoá đơn, ghi nhận khi đã trả dùng đúng ảnh này — không đọc lại
// giá gói hiện tại. `{}` = hoá đơn trước 039 (ghi nhận theo luật cũ: kỳ mới / gói credit; addon cũ → đối soát, không tự đoán hạn).

export const BILLING_ACTOR = 'system:billing';

/** Gói trả phí: kỳ mới (chưa có gói trả phí còn hạn) · gia hạn cùng gói (nối tiếp ngày hết hạn) · đổi xuống gói thấp hơn từ kỳ sau. */
export interface PlanSnapshot {
  v: 1;
  mode: 'new' | 'renew' | 'switch';
  plan_key: string;
  months: number;
  /** Giá cả kỳ đã trả (VND) — làm giá trị kỳ cho lần nâng gói sau. */
  price: string;
  /** Kỳ bắt đầu (renew / switch: ngày hết hạn hiện tại). */
  starts_at?: string;
  sub_version?: number;
}

/** Nâng gói giữa kỳ: tiền = (giá kỳ đích − giá kỳ nguồn) × phần kỳ còn lại; Credit chênh × phần tháng còn lại (DC-242 / DC-243). */
export interface UpgradeSnapshot {
  v: 1;
  mode: 'upgrade';
  from_plan_key: string;
  plan_key: string;
  sub_version: number;
  term_start: string;
  term_end: string;
  /** Giá kỳ của gói đích cùng độ dài kỳ (gói năm dùng giá năm). */
  target_term_price: string;
  /** Credit cộng vào plan bucket (đã làm tròn half-up một lần). */
  credits: string;
  month_start: string;
  month_end: string;
}

/** Tài nguyên mua thêm: đồng hạn kỳ gói, thu theo phần kỳ còn lại; không có gói trả phí → một tháng từ lúc trả. */
export interface AddonSnapshot {
  v: 1;
  mode: 'addon';
  resource: 'users' | 'channels';
  quantity: number;
  price: string;
  /** null = một tháng tính từ lúc trả (không có kỳ gói trả phí để đồng hạn). */
  ends_at: string | null;
  sub_version?: number;
}

export type InvoiceSnapshot = PlanSnapshot | UpgradeSnapshot | AddonSnapshot;

export const snapshotOf = (raw: unknown): InvoiceSnapshot | null => {
  const s = raw as Partial<InvoiceSnapshot> | null;
  return s && s.v === 1 && typeof s.mode === 'string' ? (s as InvoiceSnapshot) : null;
};

export interface PlanRow {
  id: string;
  key: string;
  segment: string;
  priceMonth: bigint | null;
  priceYear: bigint | null;
  creditsMonth: bigint | null;
  maxUsers: number | null;
  maxChannels: number | null;
  maxAgents: number | null;
  isTrialPlan: boolean;
  active: boolean;
}
