// TIP-022b AC1 / AC8 — khung giờ agent: chọn Tuỳ chỉnh tạo lịch tuần rỗng có cấu trúc; `custom` cũ chưa có lịch → cảnh báo cần cấu hình;
// khoảng ngược chiều chỉ tách qua đêm khi người dùng đồng ý, không đồng ý → báo lỗi `order`; chồng khoảng → `overlap`.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { WeeklyScheduleDto } from '@appchat/shared';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));

import { WeeklyScheduleEditor } from './WeeklyScheduleEditor';
import type { AgentConfig } from '../../types';

type Cfg = Pick<AgentConfig, 'working_hours' | 'weekly_schedule'>;
const latest: { cfg?: Cfg } = {};

function Host({ init, legacy }: { init: Cfg; legacy?: boolean }) {
  const [cfg, setCfg] = useState<Cfg>(init);
  useEffect(() => {
    latest.cfg = cfg;
  }, [cfg]);
  return <WeeklyScheduleEditor cfg={cfg as AgentConfig} patch={(p) => setCfg((c) => ({ ...c, ...p }))} legacy={legacy} />;
}

const sched = (d0: { from: string; to: string }[]): WeeklyScheduleDto => ({ timezone: 'Asia/Ho_Chi_Minh', days: [d0, [], [], [], [], [], []] });

describe('WeeklyScheduleEditor', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('Luôn / Giờ hành chính không hiện lịch; chọn Tuỳ chỉnh tạo lịch tuần 7 ngày rỗng', () => {
    render(<Host init={{ working_hours: 'office', weekly_schedule: null }} />);
    expect(screen.queryByTestId('agb-week')).toBeNull();
    fireEvent.change(screen.getByTestId('agb-hours'), { target: { value: 'custom' } });
    expect(screen.getByTestId('agb-week')).toBeTruthy();
    expect(latest.cfg?.weekly_schedule?.days).toHaveLength(7);
    expect(screen.queryByTestId('agb-schedule-warning')).toBeNull();
  });

  it('custom cũ chưa có lịch → cảnh báo cần cấu hình (không tự nới / thu hẹp)', () => {
    render(<Host init={{ working_hours: 'custom', weekly_schedule: null }} />);
    expect(screen.getByTestId('agb-schedule-warning').textContent).toBe('agents.b.schedule.needsConfig');
    expect(latest.cfg?.weekly_schedule).toBeNull();
  });

  it('thêm khoảng mặc định 08:00–17:30; xoá khoảng trở về Nghỉ', () => {
    render(<Host init={{ working_hours: 'custom', weekly_schedule: sched([]) }} />);
    fireEvent.click(screen.getByTestId('agb-week-0-add'));
    expect(latest.cfg?.weekly_schedule?.days[0]).toEqual([{ from: '08:00', to: '17:30' }]);
    fireEvent.click(screen.getByTestId('agb-week-0-0-rm'));
    expect(latest.cfg?.weekly_schedule?.days[0]).toEqual([]);
  });

  it('khoảng qua đêm: đồng ý → tách hai ngày; từ chối → giữ để báo lỗi order', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Host init={{ working_hours: 'custom', weekly_schedule: sched([{ from: '22:00', to: '23:00' }]) }} />);
    fireEvent.change(screen.getByTestId('agb-week-0-0-to'), { target: { value: '06:00' } });
    expect(latest.cfg?.weekly_schedule?.days[0]).toEqual([{ from: '22:00', to: '06:00' }]);
    expect(screen.getByText('common.schedule.err.order')).toBeTruthy();
    fireEvent.change(screen.getByTestId('agb-week-0-0-to'), { target: { value: '05:30' } });
    expect(latest.cfg?.weekly_schedule?.days[0]).toEqual([{ from: '22:00', to: '24:00' }]);
    expect(latest.cfg?.weekly_schedule?.days[1]).toEqual([{ from: '00:00', to: '05:30' }]);
  });

  it('hai khoảng chồng nhau → lỗi overlap hiển thị', () => {
    render(<Host init={{ working_hours: 'custom', weekly_schedule: sched([{ from: '08:00', to: '12:00' }, { from: '11:00', to: '13:00' }]) }} />);
    expect(screen.getAllByText('common.schedule.err.overlap').length).toBeGreaterThan(0);
  });
});
