// Trạng thái ô lịch tuần (TIP-022b): sửa khoảng / thêm / xoá / đổi múi, validate bằng luật chung với server. Khoảng qua đêm (đến < từ) chỉ
// tách sang ngày sau khi người dùng xác nhận (`confirmOvernight`) — không tự đoán. Dùng ở Builder agent + drawer Quản lý kênh.
'use client';
import { useMemo } from 'react';
import { canonicalSchedule, emptySchedule, splitOvernight, type WeeklyScheduleDto } from '@appchat/shared';

export function useWeeklySchedule(value: WeeklyScheduleDto | null | undefined, onChange: (v: WeeklyScheduleDto) => void, confirmOvernight: () => boolean) {
  const cur = value ?? emptySchedule();
  const errors = useMemo(() => canonicalSchedule(cur).errors, [cur]);
  const set = (days: WeeklyScheduleDto['days']) => onChange({ ...cur, days });
  const copy = () => cur.days.map((d) => d.map((iv) => ({ ...iv })));
  return {
    value: cur,
    errors,
    valid: !Object.keys(errors).length,
    onTimezone: (timezone: string) => onChange({ ...cur, timezone }),
    onAdd: (day: number) => {
      const days = copy();
      const last = days[day]!.at(-1);
      days[day]!.push(last ? { from: last.to === '24:00' ? '23:00' : last.to, to: '24:00' } : { from: '08:00', to: '17:30' });
      set(days);
    },
    onRemove: (day: number, idx: number) => {
      const days = copy();
      days[day]!.splice(idx, 1);
      set(days);
    },
    onChange: (day: number, idx: number, key: 'from' | 'to', v: string) => {
      const days = copy();
      const iv = { ...days[day]![idx]!, [key]: v };
      // Qua đêm: hỏi rồi tách hai ngày (22:00–24:00 + 00:00–06:00); không đồng ý → giữ nguyên để báo lỗi `order`.
      if (key === 'to' && v !== '24:00' && iv.from > v && confirmOvernight()) {
        days[day]!.splice(idx, 1);
        set(splitOvernight(days, day, iv.from, v));
        return;
      }
      days[day]![idx] = iv;
      set(days);
    },
  };
}
