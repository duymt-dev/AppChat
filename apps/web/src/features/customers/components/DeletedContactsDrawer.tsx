// Drawer "Khách đã xoá" (TIP-015f §5.3–§5.4): mở từ nút ở đầu màn Khách hàng (chỉ người có crm.delete), danh sách theo scope hiện tại, mới xoá
// trước, tìm tên / SĐT / mã, "Xem thêm" theo cursor. Khôi phục cần xác nhận; 409 giải thích lý do (quá hạn / trùng SĐT / đã thay đổi) và giữ
// drawer mở. Không tự đổi người phụ trách / gộp khách. Mở rộng chức năng ngoài prototype — dùng EntityDrawer + token sẵn có.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color } from '@appchat/ui';
import type { DeletedContact } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { useCrmUi } from '../crm-store';
import { useDeletedContacts } from '../hooks/useDeletedContacts';
import { useTrashStyles } from '../styles/trash.styles';

export function DeletedContactsDrawer() {
  const t = useTranslations('customers.trash');
  const ui = useCrmUi();
  const open = ui.modal === 'trash';
  const { styles, cx } = useTrashStyles();
  const { modal } = App.useApp();
  const fmt = useFmt();
  const d = useDeletedContacts(open);
  const close = () => ui.set({ modal: null });

  const confirm = (c: DeletedContact) =>
    modal.confirm({
      title: t('confirmTitle', { name: c.name }),
      content: t('confirmBody'),
      okText: t('restore'),
      cancelText: t('cancel'),
      onOk: () => d.restore(c),
    });

  const body = () => {
    if (d.list.isLoading) return <div className={styles.state}>{t('loading')}</div>;
    if (d.list.isError) return <div className={styles.state}>{t('error')}</div>;
    if (!d.rows.length) return <div className={styles.state} data-testid="crm-trash-empty">{t('empty')}</div>;
    return d.rows.map((c) => (
      <div key={c.id} className={styles.row} data-testid={`crm-trash-row-${c.id}`}>
        <div className={styles.main}>
          <div className={styles.name}>
            {c.name} · {c.code}
          </div>
          <div className={styles.meta}>
            {t('deletedAt', { at: `${fmt.date(c.deleted_at)} ${fmt.time(c.deleted_at)}` })} · {c.status === 'expired' ? t('expiredAt', { at: fmt.date(c.restore_until) }) : t('until', { at: fmt.date(c.restore_until) })}
          </div>
          {d.problem?.id === c.id ? (
            <div className={styles.problem} role="alert" data-testid="crm-trash-problem">
              {t(`problem.${d.problem.kind}`)}
            </div>
          ) : null}
        </div>
        {c.status === 'restorable' ? (
          <button type="button" className={styles.btn} disabled={d.pending} onClick={() => confirm(c)} data-testid={`crm-trash-restore-${c.id}`}>
            {t('restore')}
          </button>
        ) : (
          <span className={styles.pill}>{t(`status.${c.status}`)}</span>
        )}
      </div>
    ));
  };

  return (
    <EntityDrawer open={open} onClose={close} title={t('title')} icon="ic-trash" iconBg={color.dangerSoftBg} closeLabel={t('close')} testId="crm-trash" width={480}>
      <div className={styles.search}>
        <Icon name="ic-search" size={13} color={color.text4} strokeWidth={1.9} />
        <input className={styles.searchInput} value={d.q} onChange={(e) => d.setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} data-testid="crm-trash-search" />
      </div>
      <div className={styles.hint}>{t('hint')}</div>
      {body()}
      {d.list.hasNextPage ? (
        <button type="button" className={cx(styles.btn, styles.more)} disabled={d.list.isFetchingNextPage} onClick={() => void d.list.fetchNextPage()}>
          {t('more')}
        </button>
      ) : null}
    </EntityDrawer>
  );
}
