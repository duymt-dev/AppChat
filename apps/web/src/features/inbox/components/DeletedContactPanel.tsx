// Panel thay Hồ sơ 360° khi khách của hội thoại đã xoá mềm (TIP-015f §4.4): chỉ dấu vòng đời, KHÔNG hồ sơ CRM cũ / tên VIP / hành động tạo
// báo giá, lịch hẹn, chia sẻ từ cache. Lịch sử tin vẫn ở khung chat theo quyền Hộp thư. Người có crm.delete được chỉ lối sang thùng rác ở màn
// Khách hàng (khôi phục ở đó, có xác nhận) — không có quyền thì chỉ thấy dấu chung.
'use client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { usePanelStyles } from '../styles/panel.styles';
import { useInboxUi } from '../inbox-store';

export function DeletedContactPanel() {
  const t = useTranslations('inbox.deletedContact');
  const { styles } = usePanelStyles();
  const ui = useInboxUi();
  const canRestore = useCan('crm.delete');
  return (
    <aside className={styles.panel} data-testid="panel-deleted-contact">
      <div className={styles.head}>
        <span className={styles.headIcon} style={{ background: color.dangerDeep }}>
          <Icon name="ic-trash" size={14} color={color.white} />
        </span>
        {t('title')}
        <button type="button" className={styles.close} onClick={ui.toggle360} aria-label={t('close')}>
          <Icon name="ic-x" size={18} color={color.text3} />
        </button>
      </div>
      <div className={styles.scroll} role="status">
        <p>{t('body')}</p>
        {canRestore ? (
          <Link href="/customers" data-testid="deleted-contact-trash-link">
            {t('openTrash')}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
