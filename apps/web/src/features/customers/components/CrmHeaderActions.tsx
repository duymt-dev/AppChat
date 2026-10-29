// Nút trên đầu màn Khách hàng — prototype L2456–2463: tìm kiếm · Check trùng · Trường mở rộng · Nhập · Xuất Excel · Tạo liên hệ · Trợ lý AI.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useCrmStyles } from '../styles/crm.styles';
import { useCrmUi } from '../crm-store';

export function CrmHeaderActions({ dupCount }: { dupCount: number }) {
  const t = useTranslations('customers');
  const { styles, cx } = useCrmStyles();
  const ui = useCrmUi();
  const canEdit = useCan('crm.edit');
  const canFields = useCan('crm.fields_manage');
  const canImport = useCan('crm.import');
  const canExport = useCan('crm.export');

  return (
    <>
      <div className={styles.search}>
        <span className={styles.searchIcon}>
          <Icon name="ic-search" size={13} color={color.text4} strokeWidth={1.9} />
        </span>
        <input
          className={styles.searchInput}
          value={ui.filter.q}
          onChange={(e) => ui.setFilter({ q: e.target.value })}
          placeholder={t('search')}
          aria-label={t('search')}
          data-testid="crm-search"
        />
      </div>
      <button type="button" className={cx(styles.chip, styles.hideMd)} onClick={() => ui.open('dedupe')} data-testid="crm-dedupe">
        <Icon name="ic-filter" size={13} color={color.text3} />
        {t('dedupe')}
        <span className={styles.badge}>{dupCount}</span>
      </button>
      {canFields ? (
        <button type="button" className={cx(styles.chip, styles.hideMd)} onClick={() => ui.open('fields')} data-testid="crm-fields">
          <Icon name="ic-cog" size={13} color={color.text3} />
          {t('fields')}
        </button>
      ) : null}
      {canImport ? (
        <button type="button" className={cx(styles.chip, styles.hideMd)}>
          <Icon name="ic-download" size={13} color={color.text3} />
          {t('import')}
        </button>
      ) : null}
      {canExport ? (
        <button type="button" className={cx(styles.chip, styles.hideMd)}>
          <Icon name="ic-download" size={13} color={color.text3} style={{ transform: 'rotate(180deg)' }} />
          {t('export')}
        </button>
      ) : null}
      {canEdit ? (
        <button type="button" className={styles.btnp} onClick={() => ui.open('create')} data-testid="crm-create">
          <Icon name="ic-plus" size={13} color={color.forestDeep} strokeWidth={2} />
          {t('create')}
        </button>
      ) : null}
      <button type="button" className={cx(styles.btnp, styles.btnDark)} onClick={() => ui.open('ai')} data-testid="crm-ai">
        <Icon name="ic-spark" size={13} color={color.sparkMint} strokeWidth={1.9} />
        {t('assistant')}
      </button>
    </>
  );
}
