// Menu ⋯ của một hàng trong Cài đặt — prototype L6046 / L6073 / L7117: nút 28 (44 trên mobile), hộp 160 bo 10, mục Sửa / Xoá đỏ.
// Một menu mở tại một thời điểm (settings-store.menuFor); bấm ra ngoài đóng.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useSettingsUi } from '../settings-store';

export interface RowMenuItem {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  onClick: () => void;
}

export function RowMenu({ id, items, dots }: { id: string; items: RowMenuItem[]; dots?: 'v' | 'h' }) {
  const t = useTranslations('settings');
  const { styles, cx } = useSectionStyles();
  const menuFor = useSettingsUi((s) => s.menuFor);
  const set = useSettingsUi((s) => s.set);
  const open = menuFor === id;
  return (
    <div className={styles.rel}>
      <button type="button" className={styles.more} aria-label={t('rowMenu')} aria-expanded={open} onClick={() => set({ menuFor: open ? null : id })} data-testid="st-row-menu">
        <Icon name={dots === 'v' ? 'ic-more-v' : 'ic-more-h'} size={16} color={color.text4} strokeWidth={2} />
      </button>
      {open ? (
        <>
          <span className={styles.scrim} onClick={() => set({ menuFor: null })} />
          <div className={styles.menu} role="menu">
            {items.map((it) => (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                className={cx(styles.mItem, it.danger && styles.mDanger)}
                onClick={() => {
                  set({ menuFor: null });
                  it.onClick();
                }}
              >
                <Icon name={it.icon} size={14} color={it.danger ? color.dangerStrong : color.text3} />
                {it.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
