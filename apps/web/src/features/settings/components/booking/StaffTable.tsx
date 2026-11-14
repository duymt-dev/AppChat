// Danh sách nhân sự nhận lịch (TIP-033b §3.6): trang theo staff_next_cursor ("Tải thêm"), đang hoạt động trước; 0 nhân sự → hướng dẫn thêm
// (không tự tạo nhân sự mặc định). Bấm dòng → drawer sửa.
'use client';
import { useTranslations } from 'next-intl';
import { useSectionStyles } from '../../styles/section.styles';
import { useBookingStyles } from '../../styles/booking.styles';
import type { BookingStaff } from '../../hooks/useBookingSettings';

interface Props {
  staff: BookingStaff[];
  more: boolean;
  loadingMore: boolean;
  onMore: () => void;
  onOpen: (s: BookingStaff | null) => void;
  readOnly: boolean;
}

export function StaffTable({ staff, more, loadingMore, onMore, onOpen, readOnly }: Props) {
  const t = useTranslations('settings.booking');
  const s = useSectionStyles().styles;
  const { styles, cx } = useBookingStyles();
  const summary = (x: BookingStaff) => {
    const closed = x.schedule.filter((d) => !d.open).length;
    const custom = x.schedule.length - closed;
    return [x.role, x.active ? null : t('inactive'), x.schedule.length ? t('ownDays', { closed, custom }) : t('inheritAll')].filter(Boolean).join(' · ');
  };
  return (
    <div className={styles.box} data-testid="st-bk-staff">
      <div className={s.between}>
        <div className={styles.title}>{t('staff')}</div>
        {readOnly ? null : (
          <button type="button" className={s.sm} onClick={() => onOpen(null)} data-testid="st-bk-add">
            {t('addStaff')}
          </button>
        )}
      </div>
      {staff.length ? (
        staff.map((x) => (
          <button
            type="button"
            key={x.id}
            className={cx(styles.staffRow, !x.active && styles.off)}
            disabled={readOnly}
            onClick={() => onOpen(x)}
            data-testid={`st-bk-row-${x.id}`}
          >
            <span className={styles.av} style={{ background: x.color }}>
              {x.initial}
            </span>
            <span className={s.grow}>
              <span className={s.cT}>{x.name}</span>
              <span className={styles.sub}>{summary(x)}</span>
            </span>
          </button>
        ))
      ) : (
        <div className={styles.empty} data-testid="st-bk-empty">
          {t('noStaff')}
        </div>
      )}
      {more ? (
        <button type="button" className={s.ghost} disabled={loadingMore} onClick={onMore} data-testid="st-bk-more">
          {t('more')}
        </button>
      ) : null}
    </div>
  );
}
