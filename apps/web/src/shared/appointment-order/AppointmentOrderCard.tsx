// Thẻ "Tạo đơn cho buổi này?" dùng chung Lịch hẹn / Hộp thư / Trợ lý (TIP-033c §2, COMMERCE 8b): chỉ là GỢI Ý — giá / thuế / tổng hiện hành
// do server chiếu; bấm "Tạo đơn" → xem trước bắt buộc (hộp xác nhận chung) → biên nhận thật. Trạng thái: chờ xác nhận / đã tạo / đã có đơn
// (client khác tạo trước) / giá hoặc lịch đã đổi (đọc lại) / không còn khả dụng. Không có "thành công" từ điều hướng hay 202.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';
import { useFmt } from '../i18n/useFmt';
import { useAppointmentOrder } from './useAppointmentOrder';
import type { CardState, OrderSuggestion, OrderSuggestionSource } from './types';

const useStyles = createStyles(({ css, responsive }) => ({
  card: css`
    background: ${color.brandBg};
    border: 1px solid ${color.activeLine};
    border-radius: ${radius.r10}px;
    padding: 12px;
    margin-bottom: 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    b {
      display: block;
      font-size: ${font.scale.s14}px;
      color: ${color.text};
      margin-bottom: 4px;
    }
  `,
  line: css`
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 6px;
    color: ${color.text};
  `,
  total: css`
    font-weight: ${font.weight.bold};
  `,
  note: css`
    margin-top: 8px;
    color: ${color.text2};
  `,
  warn: css`
    margin-top: 8px;
    color: ${color.warn};
  `,
  btn: css`
    margin-top: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
    &:focus-visible {
      outline: 2px solid ${color.brand};
      outline-offset: 2px;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  link: css`
    margin-top: 8px;
    margin-left: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.activeLine};
    background: ${color.white};
    color: ${color.text};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));

function Card({ c, state, onCreate, onOpen }: { c: OrderSuggestion; state: CardState; onCreate: () => void; onOpen?: (orderId: string) => void }) {
  const t = useTranslations('calendar.orderCard');
  const fmt = useFmt();
  const { styles } = useStyles();
  return (
    <div className={styles.card} data-testid="appt-order-card" data-appointment={c.appointment_id} role="group" aria-label={t('title')}>
      <b>{t('title')}</b>
      {t('hint', { code: c.code, time: `${fmt.date(c.start_at)} ${fmt.time(c.start_at)}` })}
      <div className={styles.line}>
        <span>{c.service_name}</span>
        <span>{fmt.money(c.unit_price)}</span>
      </div>
      <div className={styles.line}>
        <span>{t('tax', { rate: c.tax_rate })}</span>
        <span>{fmt.money(c.tax_total)}</span>
      </div>
      <div className={`${styles.line} ${styles.total}`}>
        <span>{t('total')}</span>
        <span data-testid="appt-order-total">{fmt.money(c.total)}</span>
      </div>
      {state.kind === 'created' ? (
        <div className={styles.note} data-testid="appt-order-created">
          {t(state.reused ? 'reused' : 'created', { code: state.code })}
          {onOpen ? (
            <button type="button" className={styles.link} onClick={() => onOpen(state.orderId)} data-testid="appt-order-open">
              {t('open')}
            </button>
          ) : null}
        </div>
      ) : state.kind === 'changed' ? (
        <div className={styles.warn} role="status" data-testid="appt-order-changed">
          {t('changed')}
        </div>
      ) : state.kind === 'unavailable' ? (
        <div className={styles.warn} role="status" data-testid="appt-order-unavailable">
          {t('unavailable')}
        </div>
      ) : c.can_create ? (
        <button type="button" className={styles.btn} disabled={state.kind === 'confirming'} onClick={onCreate} data-testid="appt-order-create">
          {state.kind === 'confirming' ? t('confirming') : t('create')}
        </button>
      ) : (
        <div className={styles.note} data-testid="appt-order-noright">
          {t('noRight')}
        </div>
      )}
    </div>
  );
}

/** Danh sách thẻ của một nguồn (một lịch hoặc một hội thoại) — rỗng thì không hiện gì; hội thoại nhiều lịch có "Xem thêm". */
export function AppointmentOrderCards({ source, onOpenOrder }: { source: OrderSuggestionSource | null; onOpenOrder?: (orderId: string) => void }) {
  const t = useTranslations('calendar.orderCard');
  const { styles } = useStyles();
  const o = useAppointmentOrder(source);
  if (o.isError)
    return (
      <div className={styles.warn} role="status" data-testid="appt-order-error">
        {t('loadError')}
        <button type="button" className={styles.link} onClick={() => void o.refetch()}>
          {t('retry')}
        </button>
      </div>
    );
  if (!o.cards.length && !o.receipts.length) return null;
  return (
    <div data-testid="appt-order-cards">
      {o.cards.map((c) => (
        <Card key={`${c.appointment_id}@${c.revision}`} c={c} state={o.stateOf(c)} onCreate={() => void o.confirm(c)} onOpen={onOpenOrder} />
      ))}
      {o.receipts.map(({ key, state }) =>
        state.kind === 'created' ? (
          <div key={key} className={styles.card} data-testid="appt-order-created">
            <b>{t('title')}</b>
            {t(state.reused ? 'reused' : 'created', { code: state.code })}
            {onOpenOrder ? (
              <button type="button" className={styles.link} onClick={() => onOpenOrder(state.orderId)} data-testid="appt-order-open">
                {t('open')}
              </button>
            ) : null}
          </div>
        ) : null,
      )}
      {o.more ? (
        <button type="button" className={styles.link} onClick={o.more} data-testid="appt-order-more">
          {t('more')}
        </button>
      ) : null}
    </div>
  );
}
