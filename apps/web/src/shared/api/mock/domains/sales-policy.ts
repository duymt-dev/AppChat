// Ngưỡng duyệt báo giá đang áp trong mock (TIP-032b P1) — tách riêng để quotes / quotes-actions đọc mà không import domain settings hay
// store (kiểu cấu trúc — tránh vòng phụ thuộc qua handlers / routes / store).
import type { ApprovalPolicy, SalesPolicyDto } from '@appchat/shared';

type WithSales = { settings: { sales: Pick<SalesPolicyDto, 'approval_total_vnd' | 'approval_discount_pct'> } };

export const approvalPolicyOf = (db: WithSales): ApprovalPolicy => ({ total_vnd: db.settings.sales.approval_total_vnd, discount_pct: db.settings.sales.approval_discount_pct });
