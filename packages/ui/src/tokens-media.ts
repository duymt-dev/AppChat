// Breakpoint của prototype — tách khỏi tokens.ts (trần 400 dòng); re-export ở tokens.ts.
/** Breakpoint của prototype (CSS L70–400) — style của features dùng token này hoặc `responsive.*` của antd-style, không viết `@media` tay
 *  (TIP-001b §3.2, lint `no-restricted-syntax`). Ngưỡng prototype khác thang antd (md = 991) nên giữ nguyên giá trị. */
export const mq = {
  /** Auth 1 cột (L180). */
  auth: '@media (max-width: 1100px)',
  /** Lưới agent dashboard 5 → 3 cột (L345). */
  max1280: '@media (max-width: 1280px)',
  /** Dưới khung shell tối thiểu (`layout.minShell`): hồ sơ 360° Hộp thư trượt phủ (L76). */
  max1180: '@media (max-width: 1180px)',
  /** Lưới thẻ agent tự xếp (L206). */
  max1100: '@media (max-width: 1100px)',
  /** Lưới agent dashboard 2 cột (L346). */
  max900: '@media (max-width: 900px)',
  /** Lưới agent dashboard 1 cột (L347). */
  max560: '@media (max-width: 560px)',
  /** Thiết bị không hover (cảm ứng): nút ẩn-khi-chưa-hover luôn hiện, vùng chạm 44px (L387). */
  noHover: '@media (hover: none)',
} as const;
