// Đọc + lệnh auth (Blueprint §4.2). Auth nằm ngoài Action Registry (chưa có phiên) — đi qua transport.post.
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';

export interface BrandData {
  card: { initials: string; name: string; meta: string; tag: string; message: string; ai: string };
  stats: { v: string; l: string }[];
}

export interface TaxLookup {
  legal_name: string;
  address: string;
  representative: string;
  phone: string;
  founded_on: string;
  legal_status: string;
}

export interface SessionInfo {
  authed: boolean;
  declared: boolean;
  trialSeen: boolean;
  expiredSeen: boolean;
  trialDaysLeft: number;
  provisioned: boolean;
  trialEndsAt: number;
}

export const authKeys = {
  brand: ['auth', 'brand'] as const,
  session: ['session'] as const,
};

export const authBrandQuery = () =>
  queryOptions({ queryKey: authKeys.brand, queryFn: () => transport.get<BrandData>('/auth/brand'), staleTime: Infinity });

export const sessionQuery = () =>
  queryOptions({ queryKey: authKeys.session, queryFn: () => transport.get<SessionInfo>('/session') });

export const authApi = {
  requestOtp: (email: string, purpose: 'register' | 'login' | 'reset') =>
    transport.post<void>('/auth/otp/request', { email, purpose }),
  verifyOtp: (email: string, code: string, purpose: 'register' | 'login') =>
    transport.post<{ needs_declare: boolean }>('/auth/otp/verify', { email, code, purpose }),
  passwordLogin: (email: string, password: string, remember: boolean) =>
    transport.post<{ needs_declare: boolean }>('/auth/password/login', { email, password, remember }),
  requestReset: (email: string) => transport.post<void>('/auth/password/reset-request', { email }),
  resetPassword: (token: string, password: string) => transport.post<void>('/auth/password/reset', { token, password }),
  logout: () => transport.post<void>('/auth/logout'),
  ackNotice: (notice: 'trial_welcome' | 'trial_expired') => transport.post<void>('/session/ack', { notice }),
  provisioning: () => transport.get<{ status: 'running' | 'ready' | 'failed' }>('/workspace/provisioning'),
  taxLookup: (taxCode: string) => transport.get<TaxLookup>(`/business-lookup/tax/${encodeURIComponent(taxCode)}`),
};
