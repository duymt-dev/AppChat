// Vận chuyển nhập tay (COMMERCE §4: đơn vị, mã vận đơn, ngày giao dự kiến — tích hợp hãng vận chuyển để P2). Lưu = order.update_shipping
// kèm `if_version` của đơn đã mở (TIP-032c) — 409 → báo xung đột, giữ ô đang nhập.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useOrderTabStyles } from '../styles/tabs.styles';
import type { Order } from '../types';
import { useOrderEditVersion } from '../hooks/useOrderEditVersion';
import { OrderEditConflict } from './OrderEditConflict';

const KEYS = ['carrier', 'tracking', 'eta'] as const;

export function ShippingCard({ o }: { o: Order }) {
  // Mở lại ô nhập chỉ khi người dùng bấm "Tải lại" sau xung đột (version chốt lúc mở — TIP-032c).
  const [nonce, setNonce] = useState(0);
  return <ShippingForm key={nonce} o={o} onReloaded={() => setNonce((n) => n + 1)} />;
}

function ShippingForm({ o, onReloaded }: { o: Order; onReloaded: () => void }) {
  const t = useTranslations('orders.detail');
  const { styles, cx } = useOrderTabStyles();
  const canManage = useCan('order.manage');
  const save = useAction('order.update_shipping');
  const ver = useOrderEditVersion(o.id, o.version, onReloaded);
  const [v, setV] = useState({
    carrier: o.shipping.carrier,
    tracking: o.shipping.tracking,
    eta: o.shipping.eta,
  });
  const editable = canManage && o.status !== 'cancelled';
  return (
    <div className={styles.card}>
      <div className={cx(styles.h, styles.hTight)}>{t('shipping')}</div>
      {ver.conflict ? <OrderEditConflict onReload={() => void ver.reload()} /> : null}
      <div className={styles.shipGrid}>
        {KEYS.map((k) => (
          <div key={k}>
            <label htmlFor={`od-ship-${k}`}>{t(k)}</label>
            <input
              id={`od-ship-${k}`}
              type={k === 'eta' ? 'date' : 'text'}
              value={v[k]}
              disabled={!editable}
              onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))}
              data-testid={`od-ship-${k}`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.btn}
        disabled={!editable}
        onClick={() => void save.run({ order_id: o.id, if_version: ver.ifVersion, shipping: v }, { onError: ver.onError })}
        data-testid="od-ship-save"
      >
        {t('saveShip')}
      </button>
    </div>
  );
}
