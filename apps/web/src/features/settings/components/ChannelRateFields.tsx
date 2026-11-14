// Tốc độ gửi của tài khoản kênh (TIP-037, D35 / REQ-B04c) — khối Đồng bộ của drawer Quản lý kênh: tin / phút và trần tin chủ động / ngày
// (chiến dịch, follow-up). Vắng cài đặt → mặc định của manifest kênh (hiện làm gợi ý). Trần ngày Zalo cá nhân vượt mặc định → cảnh báo
// rủi ro khoá tài khoản (vẫn lưu được; server cũng cảnh báo ở preview). Hàng gửi đọc lại mỗi tin — đổi có hiệu lực từ tin kế tiếp.
'use client';
import { useTranslations } from 'next-intl';
import { CHANNEL_RATE_MAX, DAILY_CAP_MAX } from '@appchat/shared';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import type { ChannelAccount } from '../channel-types';

type Rate = Pick<ChannelAccount, 'rate_per_minute' | 'daily_cap' | 'rate_default' | 'daily_cap_default'>;

/** Số nguyên dương trong [1, max]; rỗng / sai → undefined (giữ giá trị cũ). */
const intIn = (v: string, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : undefined;
};

export function ChannelRateFields({ value, onChange }: { value: Rate; onChange: (p: Partial<Rate>) => void }) {
  const t = useTranslations('settings.channels.drawer.rate');
  const s = useSectionStyles().styles;
  const { styles, cx } = useChannelManageStyles();
  if (value.rate_default === undefined) return null;
  const capDefault = value.daily_cap_default ?? null;
  const over = capDefault !== null && (value.daily_cap ?? 0) > capDefault;
  return (
    <div data-testid="st-ch-drawer-rate">
      <div className={styles.syncRow}>
        <div className={styles.acctBody}>
          <div className={styles.syncLbl}>{t('perMinute')}</div>
          <div className={styles.syncD}>{t('perMinuteD', { n: value.rate_default })}</div>
        </div>
        <input
          className={cx(s.input, styles.historySelect)}
          type="number"
          min={1}
          max={CHANNEL_RATE_MAX}
          value={value.rate_per_minute ?? ''}
          onChange={(e) => onChange({ rate_per_minute: intIn(e.target.value, CHANNEL_RATE_MAX) })}
          aria-label={t('perMinute')}
          data-testid="st-ch-drawer-rate-minute"
        />
      </div>
      {capDefault !== null ? (
        <div className={styles.syncRow}>
          <div className={styles.acctBody}>
            <div className={styles.syncLbl}>{t('dailyCap')}</div>
            <div className={styles.syncD}>{t('dailyCapD', { n: capDefault })}</div>
          </div>
          <input
            className={cx(s.input, styles.historySelect)}
            type="number"
            min={1}
            max={DAILY_CAP_MAX}
            value={value.daily_cap ?? ''}
            onChange={(e) => onChange({ daily_cap: intIn(e.target.value, DAILY_CAP_MAX) })}
            aria-label={t('dailyCap')}
            data-testid="st-ch-drawer-rate-daily"
          />
        </div>
      ) : null}
      {over ? (
        <div className={s.muted} role="alert" data-testid="st-ch-drawer-rate-warn">
          {t('overDefault', { n: capDefault })}
        </div>
      ) : null}
    </div>
  );
}
