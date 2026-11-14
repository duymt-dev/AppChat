// Khối `appointment_order` (TIP-033c §2.2): cây chỉ mang id lịch — thẻ đọc lại gợi ý hiện hành qua action `appointment.order_suggestions`
// (giá / quyền tạo của người xem lúc này, không tin dữ liệu trong cây), tạo đơn qua xem trước chuẩn; mở đơn = lệnh UI `open order`.
'use client';
import { AppointmentOrderCards } from '../../appointment-order/AppointmentOrderCard';
import { useGenUi } from '../context';
import type { BlockOf, BlockProps } from '../types';

export function AppointmentOrderBlock({ block }: BlockProps<BlockOf<'appointment_order'>>) {
  const { onUi } = useGenUi();
  return (
    <div data-testid="genui-appointment-order">
      <AppointmentOrderCards source={{ appointmentId: block.appointment_id }} onOpenOrder={(id) => onUi({ type: 'open', entity: 'order', id, view: 'drawer' })} />
    </div>
  );
}
