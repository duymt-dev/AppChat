// Mục Thẻ & nhãn — prototype L6031–6050: hero "Thẻ", nút Tạo thẻ (xanh dương), ô tìm 340 (không dấu), bảng 8 cột (chip màu · mô tả ·
// người tạo · nguồn · ngày tạo · người sửa cuối · ngày sửa · ⋯ Chỉnh sửa / Xoá). Ghi qua tag.* (xoá có hoàn tác 24h).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useTagsStyles } from '../styles/tags.styles';
import { useSettingsUi } from '../settings-store';
import { tagsQuery } from '../api';
import type { Tag } from '../types';
import { RowMenu } from './RowMenu';
import { TagModal } from './TagModal';

const DASH = '-';
const CHIP_ALPHA = '22';
const COLS = ['name', 'desc', 'by', 'src', 'created', 'editBy', 'updated'] as const;

function Row({ tag, can }: { tag: Tag; can: boolean }) {
  const t = useTranslations('settings.tags');
  const fmt = useFmt();
  const s = useSectionStyles().styles;
  const { styles, cx } = useTagsStyles();
  const set = useSettingsUi((u) => u.set);
  const del = useAction('tag.delete');
  const when = (iso: string) => t('at', { ...fmt.dateParts(iso), h: fmt.time(iso) });
  return (
    <div className={cx(s.tr, styles.grid)} data-tag={tag.id}>
      <span>
        <span className={styles.chip} style={{ background: `${tag.color}${CHIP_ALPHA}`, color: tag.color }}>
          {tag.emoji ? <span>{tag.emoji}</span> : null}
          {tag.name}
        </span>
      </span>
      <span className={styles.ell}>{tag.description || tag.name}</span>
      <span className={styles.hideM}>{tag.created_by}</span>
      <span className={styles.hideM}>{t(`source.${tag.source}`)}</span>
      <span className={cx(styles.sub, styles.hideM)}>{when(tag.created_at)}</span>
      <span className={cx(styles.faint, styles.hideM)}>{tag.updated_by ?? DASH}</span>
      <span className={cx(styles.sub, styles.hideM)}>{when(tag.updated_at)}</span>
      {can ? (
        <RowMenu
          id={`tag:${tag.id}`}
          dots="v"
          items={[
            { key: 'edit', label: t('edit'), icon: 'ic-edit', onClick: () => set({ tagModal: { id: tag.id } }) },
            { key: 'del', label: t('del'), icon: 'ic-trash', danger: true, onClick: () => void del.run({ tag_id: tag.id }) },
          ]}
        />
      ) : (
        <span />
      )}
    </div>
  );
}

export function TagsSection() {
  const t = useTranslations('settings.tags');
  const s = useSectionStyles().styles;
  const { styles, cx } = useTagsStyles();
  const ui = useSettingsUi();
  const can = useCan('inbox.manage');
  const q = useQuery(tagsQuery(ui.tagQ));
  const rows = q.data?.data ?? [];
  return (
    <>
      <div className={styles.hero}>
        <span className={styles.heroIc}>
          <Icon name="ic-gift" size={17} color={color.text3} />
        </span>
        <div className={s.grow}>
          <div className={styles.heroT}>{t('heroT')}</div>
          <div className={styles.heroS}>{t('heroS')}</div>
        </div>
        <button type="button" className={styles.learn}>
          <Icon name="ic-doc" size={15} color="currentColor" />
          {t('learn')}
        </button>
      </div>
      <div className={styles.bar}>
        {can ? (
          <button type="button" className={styles.newBlue} onClick={() => ui.set({ tagModal: {} })} data-testid="st-tag-new">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2.2} />
            {t('new')}
          </button>
        ) : null}
        <span className={s.grow} />
        <label className={styles.search}>
          <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} />
          <input value={ui.tagQ} onChange={(e) => ui.set({ tagQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-tag-search" />
        </label>
      </div>
      <PageStates state={stateOf(q, (d: { data: Tag[] }) => d.data.length === 0)} onRetry={() => void q.refetch()}>
        <div className={s.cardFlush} data-testid="st-tags">
          <div className={cx(s.th, styles.thGrid)}>
            {COLS.map((c) => (
              <span key={c}>{t(`col.${c}`)}</span>
            ))}
            <span className={styles.right}>{t('col.act')}</span>
          </div>
          {rows.map((tag) => (
            <Row key={tag.id} tag={tag} can={can} />
          ))}
        </div>
      </PageStates>
      {ui.tagModal ? <TagModal id={ui.tagModal.id} tags={rows} palette={q.data?.palette ?? []} /> : null}
    </>
  );
}
