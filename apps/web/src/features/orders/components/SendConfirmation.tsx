// Gửi xác nhận đơn cho khách (TIP-032b P2, `order.send_confirmation` — risk send): PDF dòng hàng + tổng + đã thu / còn lại vào hội thoại
// của khách trên kênh chọn. Màn mới không có trong prototype — hàng nút dùng lại `.btns` của tab Tổng quan + ô chọn kênh dùng chung.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { ChannelSelect, type DocChannel } from '@/shared/forms/ChannelSelect';
import { useOrderTabStyles } from '../styles/tabs.styles';
import type { Order } from '../types';

export function SendConfirmation({ o }: { o: Order }) {
  const t = useTranslations('orders.detail');
  const { styles } = useOrderTabStyles();
  const can = useCan('order.manage');
  const send = useAction('order.send_confirmation');
  const [channel, setChannel] = useState<DocChannel>('zalo_personal');
  const off = !can || o.status === 'cancelled' || send.isPending;
  return (
    <div className={styles.btns}>
      <button type="button" className={styles.btn} disabled={off} onClick={() => void send.run({ order_id: o.id, channel })} data-testid="od-send-confirmation">
        <Icon name="ic-send" size={15} color="currentColor" />
        {t('sendConfirmation')}
      </button>
      <ChannelSelect value={channel} onChange={setChannel} disabled={off} testId="od-send-channel" />
    </div>
  );
}
