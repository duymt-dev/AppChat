// Đọc của màn /admin (TIP-040): mọi route `/admin/*` chỉ cần JWT (không X-Workspace-Id — server bỏ qua nếu có) và tự kiểm quyền
// admin nền tảng mỗi request. Ghi = useAction('admin.*').
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { AdminBankTx, AdminInquiry, AdminPlan, AdminPrice, AdminProvider, AdminRouteGroup, AdminSession, AdminTemplate, AdminTransfer, AdminWorkspace, Cursored } from './types';

type Params = Record<string, string | undefined>;
const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v));

export const adminSessionQuery = () => queryOptions({ queryKey: ['admin', 'session'], queryFn: () => transport.get<AdminSession>('/admin/session'), retry: false });

const config = <T,>(path: string) => queryOptions({ queryKey: ['admin', 'config', path], queryFn: () => transport.get<T[]>(`/admin/config/${path}`) });
export const adminPlansQuery = () => config<AdminPlan>('plans');
export const adminProvidersQuery = () => config<AdminProvider>('providers');
export const adminRoutesQuery = () => config<AdminRouteGroup>('routes');
export const adminPricesQuery = () => config<AdminPrice>('prices');
export const adminTemplatesQuery = () => config<AdminTemplate>('templates');

const cursored = <T,>(key: string, path: string, p: Params) =>
  queryOptions({ queryKey: ['admin', key, p], queryFn: () => transport.get<Cursored<T>>(path, clean(p)), placeholderData: (prev) => prev });
export const adminWorkspacesQuery = (p: Params) => cursored<AdminWorkspace>('workspaces', '/admin/workspaces', p);
export const adminTransfersQuery = (p: Params) => cursored<AdminTransfer>('transfers', '/admin/transfers', p);
export const adminBankTxQuery = (p: Params) => cursored<AdminBankTx>('bank-transactions', '/admin/bank-transactions', p);
export const adminInquiriesQuery = (p: Params) => cursored<AdminInquiry>('inquiries', '/admin/sales-inquiries', p);
