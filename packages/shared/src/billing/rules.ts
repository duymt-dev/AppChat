// Luật gói / credit (REQ-A06, L01–L03, Blueprint §2.2 billing, §5.1 Usage). Dùng chung core (tính) + web (hiển thị).
export const TRIAL_PLAN_KEY = 'personal_pro';
export const TRIAL_DAYS = 15;
export const TRIAL_CREDITS = 10_000;
export const FREE_PLAN_KEY = 'free';
/** Gói Miễn phí tự lưu trữ workspace sau 90 ngày không hoạt động (Blueprint §2.0 mục 5, D23). */
export const FREE_ARCHIVE_INACTIVE_DAYS = 90;
/** Ngưỡng cảnh báo: dùng 80% / 95% hạn mức tháng (`credit_wallet.warn_80_sent_at` / `warn_95_sent_at`). */
export const CREDIT_WARN_LEVELS = [80, 95] as const;

export type QuotaResource = 'users' | 'channels' | 'agents';

/** Credit cho một bước LLM: đơn giá / 1k token, làm tròn lên (không bao giờ 0 khi có token). */
export function creditsFor(tokensIn: number, tokensOut: number, price: { per1kIn: number; per1kOut: number }): number {
  const raw = (tokensIn * price.per1kIn + tokensOut * price.per1kOut) / 1000;
  return raw <= 0 ? 0 : Math.ceil(raw);
}

/** Mức cảnh báo đã chạm (theo % đã dùng của hạn mức tháng) — `null` khi chưa tới 80% hoặc gói không có hạn mức. */
export function warnLevel(planBalance: number, creditsMonth: number | null): (typeof CREDIT_WARN_LEVELS)[number] | null {
  if (!creditsMonth || creditsMonth <= 0) return null;
  const used = ((creditsMonth - Math.max(planBalance, 0)) / creditsMonth) * 100;
  return used >= 95 ? 95 : used >= 80 ? 80 : null;
}
