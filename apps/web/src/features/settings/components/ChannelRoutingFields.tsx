// Khối "Chia lead" dùng chung của wizard kết nối kênh (bước 3) và drawer Quản lý kênh (khối Phân công) — TIP-042b. Thay ô "Cách chia"
// cũ (chỉ lưu nhãn, không chạy): hiện rule đang áp cho tài khoản (riêng tài khoản / theo mặc định / chưa bật — hàng chung). Người có
// crm.reassign mở Cài đặt › Chia lead để đổi; chỉ có channels.manage thì chỉ đọc. Cấu hình cũ "Theo ca" hiện nhãn "kiểu cũ — không chạy".
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { useSectionStyles } from '../styles/section.styles';
import { useRoutingStyles } from '../styles/routing.styles';
import type { ChannelAssignMode, ChannelRouting } from '../channel-types';

export function ChannelRoutingFields({ routing, legacy, testId }: { routing?: ChannelRouting; legacy?: ChannelAssignMode; testId: string }) {
  const t = useTranslations('settings.routing');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRoutingStyles();
  const router = useRouter();
  const canReassign = useCan('crm.reassign');
  const r = routing ?? { source: 'none' as const, rule_id: null, enabled: false, mode: 'manual', version: 0 };
  const on = r.enabled && r.mode !== 'manual';
  const status = r.source === 'none' || !r.enabled ? t('channel.off') : t(`channel.${r.source}`, { mode: t(`mode.${r.mode}` as never) });
  return (
    <div data-testid={testId}>
      <div className={s.label}>{t('channel.label')}</div>
      <div className={styles.toggle}>
        <span className={cx(styles.pill, on && styles.on)} data-testid={`${testId}-status`}>
          {status}
        </span>
        {legacy === 'shift' ? <span className={cx(styles.pill, styles.legacy)}>{t('legacyShift')}</span> : null}
        {canReassign ? (
          <button type="button" className={s.ghost} onClick={() => router.push('/settings/routing')} data-testid={`${testId}-open`}>
            {t('channel.manage')}
          </button>
        ) : null}
      </div>
      <div className={s.muted}>{canReassign ? t('channel.hint') : t('channel.readonly')}</div>
    </div>
  );
}
