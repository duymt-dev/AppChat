// Trang ký công khai phụ lục `/sign/appendix/[token]` (TIP-030b F3 spec 15): endpoint public ngoài Action Registry (server tự chuyển sang
// action nội bộ có capability niêm phong) — mở link ghi `opened`, OTP vào đúng kênh đã gửi link, ký / từ chối. Không đăng nhập.
'use client';
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { AppendixSignView } from '../types';

export const appendixSignQuery = (token: string) =>
  queryOptions({
    queryKey: ['appendix-sign', token],
    queryFn: () => transport.post<AppendixSignView>(`/public/appendix-sign/${token}/open`, {}),
    retry: false,
    staleTime: Infinity,
  });

export const appendixSignApi = {
  otp: (token: string) => transport.post<{ channel: string; sent_to: string }>(`/public/appendix-sign/${token}/otp`, {}),
  sign: (token: string, body: { otp: string; signature_png: string; consent: true }) => transport.post<AppendixSignView>(`/public/appendix-sign/${token}/sign`, body),
  decline: (token: string, reason?: string) => transport.post<AppendixSignView>(`/public/appendix-sign/${token}/decline`, reason ? { reason } : {}),
};
