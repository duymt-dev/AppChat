// Mục Lịch hẹn (TIP-033b §3, DEF-033-1): giờ mở cửa + bước lưới / đệm / no-show và nhân sự (ca riêng ba trạng thái). Chỉ ghép — form ở
// components/booking/*, dữ liệu ở hooks/useBookingSettings. Quyền booking.config (registry → no-permission khi thiếu). Màn mới không có
// trong prototype (gap-filling §2) — khung theo Chính sách bán hàng.
'use client';
import { useState } from 'react';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useBookingStyles } from '../styles/booking.styles';
import { useBookingSettings, type BookingStaff } from '../hooks/useBookingSettings';
import { BusinessHoursForm } from './booking/BusinessHoursForm';
import { StaffTable } from './booking/StaffTable';
import { StaffEditorDrawer } from './booking/StaffEditorDrawer';

export function BookingSection() {
  const { styles } = useBookingStyles();
  const f = useBookingSettings();
  const readOnly = !useCan('booking.config');
  const [open, setOpen] = useState<{ staff: BookingStaff | null } | null>(null);
  return (
    <PageStates state={stateOf(f.q)} onRetry={() => void f.q.refetch()}>
      <div className={styles.stack} data-testid="st-booking">
        <BusinessHoursForm f={f} readOnly={readOnly} />
        <StaffTable
          staff={f.staff}
          more={!!f.q.hasNextPage}
          loadingMore={f.q.isFetchingNextPage}
          onMore={() => void f.q.fetchNextPage()}
          onOpen={(staff) => setOpen({ staff })}
          readOnly={readOnly}
        />
      </div>
      {open ? <StaffEditorDrawer key={open.staff?.id ?? 'new'} staff={open.staff} onClose={() => setOpen(null)} /> : null}
    </PageStates>
  );
}
