// GET /v1/dashboard (Blueprint §4 dashboard / insights): số liệu + checklist + follow-up + tin + thông báo.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { DashboardData } from './types';

export const dashboardKeys = { all: ['dashboard'] as const };

export const dashboardQuery = () =>
  queryOptions({ queryKey: dashboardKeys.all, queryFn: () => transport.get<DashboardData>('/dashboard') });
