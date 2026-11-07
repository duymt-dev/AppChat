// Thẻ kênh dạng lưới — prototype L5918–5938: nhãn nổi (Đã kết nối / Phổ biến / bản thử nghiệm / Sắp có), tên 18, logo 42, mô tả 3 dòng,
// chân nút Quản lý / Liên kết. Nền gradient nhạt theo màu kênh.
'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useChannelsStyles } from '../styles/channels.styles';
import { useSettingsUi } from '../settings-store';
import type { Channel } from '../types';

const WIDGET = '/settings/web_widget';

export function ChannelCard({ c }: { c: Channel }) {
  const t = useTranslations('settings.channels');
  const router = useRouter();
  const { styles, cx } = useChannelsStyles();
  const set = useSettingsUi((s) => s.set);
  const can = useCan('channels.manage');
  const open = () => {
    if (c.connected) return set({ channelDrawer: { type: c.type, accountId: null } });
    if (c.type === 'webchat') return router.push(WIDGET);
    return set({ channelWizard: { type: c.type, step: 2 } });
  };
  // Nhãn: đã kết nối > nhãn prototype (Phổ biến / bản thử nghiệm). "Sắp có" hiện ở nút, không thay nhãn (giữ đúng vị trí như prototype).
  const badgeAny = c.connected ? 'on' : c.label === 'beta' ? 'beta' : c.label === 'pop' ? 'pop' : null;
  return (
    <div className={styles.card} style={{ background: `linear-gradient(150deg, ${c.color}12, ${color.white} 62%)` }} data-channel={c.type}>
      {badgeAny ? (
        <span className={cx(styles.badge, styles[`b_${badgeAny}`])}>
          {badgeAny === 'on' ? <span className={styles.bDot} /> : null}
          {badgeAny === 'pop' ? <Icon name="ic-users" size={13} color="currentColor" strokeWidth={1.9} /> : null}
          {t(`badge.${badgeAny}`)}
        </span>
      ) : null}
      <div className={styles.cHead}>
        <div className={styles.cName}>{c.name}</div>
        <span className={styles.logo} style={{ color: c.color }}>
          {c.short}
        </span>
      </div>
      <div className={styles.desc}>{t(`desc.${c.type}`)}</div>
      <span className={styles.grow} />
      <div className={styles.cFoot}>
        {can ? (
          <button type="button" className={styles.cBtn} disabled={!c.available} onClick={open} data-testid={`st-ch-${c.type}`}>
            {t(c.connected ? 'manage' : c.available ? 'link' : 'soon')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
