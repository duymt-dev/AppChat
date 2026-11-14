// Nguồn kiến thức — prototype L2745–2760 (khối "Huấn luyện tác nhân AI") + bộ chọn phạm vi kb_scope (thư mục + thẻ) theo D54:
// một kho chung của workspace, mỗi agent chỉ dùng phần được chọn; trả lời khách chỉ tài liệu public. Tải tài liệu ở Dữ liệu RAG.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { kbQuery } from '@/features/settings/api';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { KbScope } from '../../types';
import type { SectionProps } from './BasicsSection';

const ALL_DOCS = { nav: 'all', folder: null, q: '' };

export function KnowledgeSection({ cfg, patch }: SectionProps) {
  const t = useTranslations('agents.b');
  const router = useRouter();
  const { styles: bs, cx } = useBuilderStyles();
  const { styles } = useSectionStyles();
  const kb = useQuery(kbQuery(ALL_DOCS)).data;
  const scope = cfg.kb_scope;
  const docs = (kb?.data ?? []).filter((d) => d.type !== 'folder');
  const tags = [...new Set(docs.flatMap((d) => d.tags))];
  const inScope = docs.filter((d) => (d.folder_id && scope.folder_ids.includes(d.folder_id)) || d.tags.some((x) => scope.tags.includes(x)));
  const publicCount = inScope.filter((d) => d.visibility === 'public').length;
  const toggle = (k: keyof KbScope, v: string) =>
    patch({ kb_scope: { ...scope, [k]: scope[k].includes(v) ? scope[k].filter((x) => x !== v) : [...scope[k], v] } });

  return (
    <div className={bs.sec} data-testid="agb-kb">
      <div className={bs.h} style={{ marginBottom: 8 }}>
        {t('kb')}
      </div>
      <div className={styles.notice}>
        <b>{t('kbNoticeB')}</b>
        <br />
        {t('kbNotice')}
      </div>
      <div className={styles.scopeLabel}>{t('kbFolders')}</div>
      <div className={styles.chips} data-testid="agb-kb-folders">
        {(kb?.folders ?? []).map((f) => {
          const on = scope.folder_ids.includes(f.id);
          return (
            <button key={f.id} type="button" aria-pressed={on} className={cx(styles.chip, on && styles.chOn)} onClick={() => toggle('folder_ids', f.id)} data-kb-folder={f.id}>
              <Icon name="ic-folder" size={13} color={on ? color.brand : color.text3} strokeWidth={1.9} />
              {f.name}
              {on ? <Icon name="ic-check" size={13} color={color.brand} strokeWidth={2.4} /> : null}
            </button>
          );
        })}
      </div>
      <div className={styles.scopeLabel}>{t('kbTags')}</div>
      <div className={styles.chips} data-testid="agb-kb-tags">
        {tags.map((x) => {
          const on = scope.tags.includes(x);
          return (
            <button key={x} type="button" aria-pressed={on} className={cx(styles.chip, on && styles.chOn)} onClick={() => toggle('tags', x)} data-kb-tag={x}>
              {t('kbTag', { tag: x })}
              {on ? <Icon name="ic-check" size={13} color={color.brand} strokeWidth={2.4} /> : null}
            </button>
          );
        })}
      </div>
      <div className={styles.scopeSum} data-testid="agb-kb-count">
        {inScope.length ? t('kbCount', { n: inScope.length, pub: publicCount }) : t('kbEmpty')}
      </div>
      <div className={styles.kb}>
        <span className={styles.kbIcon}>
          <Icon name="ic-doc" size={20} color={color.brand} strokeWidth={1.7} />
        </span>
        <div className={styles.kbTitle}>{t('kbTitle')}</div>
        <div className={styles.kbSub}>{t('kbSub')}</div>
        <button type="button" className={styles.kbBtn} onClick={() => router.push('/settings/rag_data')}>
          <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
          {t('kbAdd')}
        </button>
      </div>
    </div>
  );
}
