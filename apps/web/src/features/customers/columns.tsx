// Cột DataTable Khách hàng — prototype L2516 (16 cột; độ rộng theo grid-template của prototype) + thẻ mobile (< md).
'use client';
import { useTranslations } from 'next-intl';
import { ActionMenu, type TableColumnsType } from '@appchat/ui';
import { useCellStyles } from './styles/cells.styles';
import { useCrmUi } from './crm-store';
import { useRowMenu } from './hooks/useRowMenu';
import { AiCell, ChannelCell, NameCell, OwnerCell, StatusCell } from './components/Cells';
import { useCustomColumns } from '@/shared/custom-fields';
import type { ContactRow } from './types';

export function RowActions({ c, variant }: { c: ContactRow; variant: 'table' | 'kanban' }) {
  const t = useTranslations('customers.menu');
  const ui = useCrmUi();
  const items = useRowMenu(variant);
  return (
    <ActionMenu
      open={ui.menuFor === c.id}
      onToggle={() => ui.set({ menuFor: ui.menuFor === c.id ? null : c.id, tagFor: null })}
      onClose={() => ui.set({ menuFor: null })}
      items={items(c)}
      label={t('open')}
      variant={variant === 'table' ? 'boxed' : 'ghost'}
      testId="crm-row-menu"
    />
  );
}

export function useContactColumns(onAiDo: () => void): TableColumnsType<ContactRow> {
  const t = useTranslations('customers');
  const { styles, cx } = useCellStyles();
  const text = (v: string, ...cls: (string | false)[]) => <span className={cx(styles.cell, ...cls)}>{v}</span>;
  const custom = useCustomColumns<ContactRow>('contact');
  return [
    { key: 'code', title: t('col.code'), width: 100, render: (_, c) => <span className={styles.code}>{c.code}</span> },
    { key: 'name', title: t('col.name'), width: 158, render: (_, c) => <NameCell c={c} /> },
    {
      key: 'reg',
      title: t('col.reg'),
      width: 104,
      render: (_, c) => (
        <div className={styles.date}>
          <div className={styles.dateMain}>{c.reg_date}</div>
          <div className={styles.time}>{c.reg_time}</div>
        </div>
      ),
    },
    { key: 'type', title: t('col.type'), width: 104, render: (_, c) => text(t(`type.${c.type}`)) },
    { key: 'group', title: t('col.group'), width: 104, render: (_, c) => text(t(`group.${c.group}`), styles.muted) },
    { key: 'channel', title: t('col.channel'), width: 100, render: (_, c) => <ChannelCell c={c} /> },
    { key: 'email', title: t('col.email'), width: 158, render: (_, c) => text(c.email, styles.email) },
    { key: 'phone', title: t('col.phone'), width: 138, render: (_, c) => text(c.phone, styles.mono) },
    { key: 'zalo', title: t('col.zalo'), width: 116, render: (_, c) => text(c.zalo, styles.mono, styles.zalo) },
    { key: 'city', title: t('col.city'), width: 100, render: (_, c) => text(c.city, styles.bold) },
    { key: 'district', title: t('col.district'), width: 78, render: (_, c) => text(c.district, styles.muted) },
    { key: 'status', title: t('col.status'), width: 108, render: (_, c) => <StatusCell c={c} /> },
    { key: 'owner', title: t('col.owner'), width: 100, render: (_, c) => <OwnerCell c={c} /> },
    { key: 'ai', title: t('col.ai'), width: 128, render: (_, c) => <AiCell c={c} onAiDo={onAiDo} /> },
    ...custom,
    {
      key: 'actions',
      title: <span className={styles.end}>{t('col.actions')}</span>,
      width: 86,
      render: (_, c) => (
        <div className={styles.end}>
          <RowActions c={c} variant="table" />
        </div>
      ),
    },
  ];
}

/** < md: thẻ khách (tên · kênh · SĐT · trạng thái · phụ trách · ⋯). */
export function ContactCard({ c }: { c: ContactRow }) {
  const { styles, cx } = useCellStyles();
  return (
    <>
      <div className={styles.mTop}>
        <div className={styles.min0}>
          <NameCell c={c} />
        </div>
        <RowActions c={c} variant="table" />
      </div>
      <div className={styles.mMeta}>
        <ChannelCell c={c} />
        <span className={cx(styles.cell, styles.mono)}>{c.phone}</span>
        <StatusCell c={c} />
        <OwnerCell c={c} />
      </div>
    </>
  );
}
