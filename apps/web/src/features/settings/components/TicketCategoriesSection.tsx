// Mục Danh mục ticket (TIP-034b §3): bộ GỢI Ý danh mục cho form / bộ lọc ticket — ticket vẫn nhận danh mục tự do, sửa ở đây không đổi
// ticket cũ. Chỉ ghép: nháp + lưu ở hooks/useTicketCategories, danh sách ở CategorySuggestionsEditor. Nhập / Xuất tệp CSV / XLSX dùng chung
// engine nhập 038b (TransferPanel) và `ticket_categories.export`. Quyền settings.manage (registry → no-permission khi thiếu). Màn mới không
// có trong prototype (gap-filling §2) — khung theo Chính sách bán hàng.
'use client';
import { useTranslations } from 'next-intl';
import { openTransfer } from '@/features/data-transfer';
import { downloadJobFile } from '@/shared/actions/download';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import type { ListExportResult } from '@appchat/shared';
import { useSectionStyles } from '../styles/section.styles';
import { useCategoriesStyles } from '../styles/categories.styles';
import { useTicketCategories } from '../hooks/useTicketCategories';
import { CategorySuggestionsEditor } from './CategorySuggestionsEditor';

export function TicketCategoriesSection() {
  const t = useTranslations('settings.ticketCategories');
  const s = useSectionStyles().styles;
  const { styles } = useCategoriesStyles();
  const f = useTicketCategories();
  const exp = useAction<ListExportResult>('ticket_categories.export');
  const download = async () => {
    const r = await exp.run({ format: 'xlsx' }, { silent: true });
    if (r?.result.download_url) await downloadJobFile(r.result.download_url, r.result.file_name);
  };
  return (
    <PageStates state={stateOf(f.q)} onRetry={() => void f.q.refetch()}>
      {f.cfg ? (
        <div className={styles.box} data-testid="st-ticket-categories" data-version={f.cfg.version}>
          <div className={styles.note}>{t('hint')}</div>
          {f.conflict ? (
            <div className={styles.warn} role="alert" data-testid="st-cat-conflict">
              {t('conflict')}
              <span className={styles.grow} />
              <button type="button" className={s.ghost} onClick={f.discard} data-testid="st-cat-reload">
                {t('reload')}
              </button>
            </div>
          ) : null}
          <CategorySuggestionsEditor f={f} readOnly={false} />
          {f.diff ? (
            <div className={styles.note} data-testid="st-cat-diff">
              {f.diff.added.length ? <div>{t('diffAdded', { list: f.diff.added.join(', ') })}</div> : null}
              {f.diff.removed.length ? <div>{t('diffRemoved', { list: f.diff.removed.join(', ') })}</div> : null}
              {f.diff.default_changed && f.labels[0] ? <div>{t('diffDefault', { label: f.labels[0].trim() })}</div> : null}
              {f.diff.reordered ? <div>{t('diffOrder')}</div> : null}
            </div>
          ) : null}
          <div className={styles.foot}>
            <button type="button" className={s.ghost} onClick={() => openTransfer({ entity: 'ticket_category_suggestions' })} data-testid="st-cat-import">
              {t('import')}
            </button>
            <button type="button" className={s.ghost} disabled={exp.isPending} onClick={() => void download()} data-testid="st-cat-export">
              {t('export')}
            </button>
            <span className={styles.grow} />
            <button type="button" className={s.ghost} disabled={!f.dirty || f.saving} onClick={f.discard} data-testid="st-cat-discard">
              {t('discard')}
            </button>
            <button type="button" className={s.primary} disabled={!f.dirty || !f.valid || f.saving} onClick={() => void f.submit()} data-testid="st-cat-save">
              {t('save')}
            </button>
          </div>
        </div>
      ) : null}
    </PageStates>
  );
}
