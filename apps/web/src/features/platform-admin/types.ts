// Kiểu của màn Quản trị nền tảng (TIP-040) — từ hợp đồng chung @appchat/shared.
export type {
  AdminBankTxDto as AdminBankTx,
  AdminInquiryDto as AdminInquiry,
  AdminPlanDto as AdminPlan,
  AdminPriceDto as AdminPrice,
  AdminProviderDto as AdminProvider,
  AdminRouteGroupDto as AdminRouteGroup,
  AdminSessionDto as AdminSession,
  AdminTemplateDto as AdminTemplate,
  AdminTransferDto as AdminTransfer,
  AdminWorkspaceDto as AdminWorkspace,
  FreezeRequestRowDto as FreezeRequest,
} from '@appchat/shared';

export const ADMIN_TABS = ['workspaces', 'plans', 'providers', 'routes', 'prices', 'transfers', 'freeze', 'templates'] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export interface Cursored<T> {
  data: T[];
  next_cursor: string | null;
}
