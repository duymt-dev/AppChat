// Cài đặt Lịch hẹn (TIP-033b §3): đọc metadata + trang nhân sự (tải thêm theo staff_next_cursor), nháp giờ mở cửa gắn version đang sửa
// (server đổi version — lưu xong / người khác lưu — thì nháp cũ tự bỏ), lưu bằng `business_hours.update` kèm if_version (409
// STALE_VERSION do useAction báo, query làm mới, nháp được giữ để sửa lại). Trạng thái 0 nhân sự / lỗi / đang tải tách bạch.
'use client';
import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { dayErrors, type BookingSettingsDto, type DayInput } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { bookingSettingsQuery } from '../api';

export type BookingStaff = BookingSettingsDto['staff'][number];
export interface HoursDraft {
  days: DayInput[];
  step: number;
  buffer: number;
  noShow: boolean;
}

const same = (a: HoursDraft, b: HoursDraft) => JSON.stringify(a) === JSON.stringify(b);

export function useBookingSettings() {
  const q = useInfiniteQuery(bookingSettingsQuery());
  const save = useAction<{ version: number }>('business_hours.update');
  const first = q.data?.pages[0];
  const staff = useMemo(() => q.data?.pages.flatMap((p) => p.staff) ?? [], [q.data]);
  const [edit, setEdit] = useState<(HoursDraft & { version: number }) | null>(null);
  const base: HoursDraft | null = first
    ? { days: first.days, step: first.slot_step_min, buffer: first.default_buffer_min, noShow: first.no_show_deducts }
    : null;
  const version = first?.version ?? 1;
  const draft = edit && edit.version === version ? edit : base;
  const patch = (p: Partial<HoursDraft>) => draft && setEdit({ ...draft, ...p, version });
  const setDay = (weekday: number, p: Partial<DayInput>) => draft && patch({ days: draft.days.map((d) => (d.weekday === weekday ? { ...d, ...p } : d)) });
  const errors = draft ? dayErrors(draft.days, 'days', true) : {};
  const dirty = !!draft && !!base && !same(draft, base);
  const submit = async () => {
    if (!draft || !dirty || Object.keys(errors).length) return;
    await save.run({ days: draft.days, slot_step_min: draft.step, default_buffer_min: draft.buffer, no_show_deducts: draft.noShow, if_version: version });
  };
  return { q, staff, draft, setDay, patch, errors, dirty, saving: save.isPending, submit, reset: () => setEdit(null) };
}
