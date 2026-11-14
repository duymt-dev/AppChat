// Khung giờ trống thật cho popover Đặt lịch ở Hộp thư (TIP-025b §E.1): dịch vụ (có thời lượng) + ngày theo múi giờ workspace (`today` của
// meta lịch) + nhân viên tuỳ chọn → `GET /calendar/slots`. Không cache vô hạn (giờ trống đổi liên tục); khoá query gồm đủ đầu vào. Thiếu
// `booking.view` → không gọi (popover ẩn ở Composer). Thứ tự = thứ tự server (sớm trước) — không gắn nhãn "AI tốt nhất".
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { calendarMetaQuery, slotsQuery as calendarSlotsQuery } from '@/features/calendar/api';

export function useInboxSlots(enabled: boolean) {
  const meta = useQuery({ ...calendarMetaQuery(), enabled }).data;
  const services = (meta?.services ?? []).filter((s) => s.duration > 0);
  const [pick, setPick] = useState<{ service: string; date: string; staff: string }>({ service: '', date: '', staff: '' });
  const service = pick.service || services[0]?.id || '';
  const date = pick.date || meta?.today || '';
  const q = useQuery({ ...calendarSlotsQuery(service, date, pick.staff), enabled: enabled && !!service && !!date, staleTime: 0 });
  const staffName = (id: string) => meta?.staff.find((s) => s.id === id)?.name ?? '';
  return {
    meta,
    services,
    staff: meta?.staff ?? [],
    service,
    date,
    staffId: pick.staff,
    set: (p: Partial<typeof pick>) => setPick((x) => ({ ...x, ...p })),
    slots: q.data?.slots ?? [],
    loading: q.isLoading,
    error: q.isError,
    refresh: () => void q.refetch(),
    staffName,
  };
}
