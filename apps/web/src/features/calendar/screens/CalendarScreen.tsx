// Lịch hẹn (orchestrator) — prototype L3871–4234: đầu màn + 4 chế độ xem (Danh sách · Ngày · Tuần · Tháng — Blueprint §7.2) + drawer · form · huỷ · AI.
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useCalendarStyles } from '../styles/calendar.styles';
import { useCalendarUi } from '../calendar-store';
import { apptsQuery, calendarMetaQuery } from '../api';
import { rangeOf } from '../dates';
import { CalendarHeader } from '../components/CalendarHeader';
import { ListView } from '../components/ListView';
import { DayView, WeekView } from '../components/WeekDayViews';
import { MonthView } from '../components/MonthView';
import { AppointmentDrawer } from '../components/AppointmentDrawer';
import { CancelApptModal } from '../components/CancelApptModal';
import { CalendarAiDrawer } from '../components/CalendarAiDrawer';
import { useCalendarUiCommands } from '../ui-commands';

export function CalendarScreen() {
  useCalendarUiCommands();
  const { styles } = useCalendarStyles();
  const ui = useCalendarUi();
  const meta = useQuery(calendarMetaQuery()).data;
  const anchor = ui.anchor ?? meta?.today ?? '';
  const [from, to] = anchor ? rangeOf(ui.view, anchor) : ['', ''];
  const list = useQuery(apptsQuery(ui.filter, from, to));
  const rows = list.data?.data ?? [];
  return (
    <div className={styles.wrap} data-testid="calendar">
      <CalendarHeader meta={meta} />
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {meta ? (
          <>
            {ui.view === 'list' ? <ListView rows={rows} meta={meta} day={anchor} /> : null}
            {ui.view === 'day' ? <DayView rows={rows} meta={meta} anchor={anchor} /> : null}
            {ui.view === 'week' ? <WeekView rows={rows} meta={meta} anchor={anchor} /> : null}
            {ui.view === 'month' ? <MonthView rows={rows} meta={meta} anchor={anchor} /> : null}
          </>
        ) : null}
      </PageStates>
      {meta ? <AppointmentDrawer meta={meta} /> : null}
      {meta ? <CalendarAiDrawer meta={meta} /> : null}
      <CancelApptModal />
    </div>
  );
}
