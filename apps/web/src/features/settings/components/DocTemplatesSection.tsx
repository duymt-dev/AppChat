// Mục Mẫu chứng từ (D30, REQ-F06b; standards/documents/templates.md; Blueprint §7.3 settings/doc_templates) — màn mới, không có trong
// prototype: TemplateList theo loại (báo giá / hợp đồng / đề nghị thanh toán / phiếu thu), "Tạo mẫu" (RichTemplateEditor) và "Tải mẫu DOCX"
// (DocxUploadWizard), mỗi loại một mẫu mặc định (không xoá được), ⋯ Xem trước (PDF dữ liệu minh hoạ) / Sửa / Xoá (hoàn tác 24h), cảnh báo
// bảng kiểm pháp lý còn thiếu (TIP-028). Quyền documents.manage.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DOC_KINDS } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useDocTplStyles } from '../styles/doc-templates.styles';
import { useSettingsUi } from '../settings-store';
import { useDocPreview } from '../hooks/useDocPreview';
import { docTemplatesQuery } from '../api';
import type { DocTemplate } from '../types';
import { DocxWizard } from './DocxWizard';
import { RichTemplateModal } from './RichTemplateModal';
import { RowMenu } from './RowMenu';

const VER = 'v';
const KINDS = ['all', ...DOC_KINDS] as const;

function Row({ x }: { x: DocTemplate }) {
  const t = useTranslations('settings.doctpl');
  const fmt = useFmt();
  const s = useSectionStyles().styles;
  const { styles, cx } = useDocTplStyles();
  const set = useSettingsUi((u) => u.set);
  const upd = useAction('doc_template.update');
  const del = useAction('doc_template.delete');
  const preview = useDocPreview();
  return (
    <div className={cx(s.tr, styles.grid)} data-doc-tpl={x.id} data-kind={x.kind}>
      <div className={styles.name}>
        <span className={styles.ic}>
          <Icon name="ic-doc" size={15} color={color.brandInk} />
        </span>
        <div className={s.grow}>
          <span>{x.name}</span>
          {x.file_name ? <div className={styles.file}>{x.file_name}</div> : null}
          {x.checklist_missing.length ? (
            <div className={styles.warn} data-testid={`doc-missing-${x.id}`}>
              <Icon name="ic-help" size={11} color={color.amberText} />
              {t('missing', { n: x.checklist_missing.length })}
            </div>
          ) : null}
        </div>
      </div>
      <span className={styles.kind}>{t(`kind.${x.kind}`)}</span>
      <span>
        <span className={cx(styles.src, x.source === 'rich' ? styles.rich : styles.docx)}>{t(`source.${x.source}`)}</span>
      </span>
      <span className={styles.ver}>{VER + x.version}</span>
      <span className={styles.by}>{t('updated', { by: x.updated_by, at: fmt.date(x.updated_at) })}</span>
      <span>
        {x.is_default ? (
          <span className={styles.def} data-testid={`doc-default-${x.kind}`}>
            <Icon name="ic-check" size={11} color={color.brandInk} strokeWidth={2.4} />
            {t('default')}
          </span>
        ) : (
          <button type="button" className={styles.setDef} onClick={() => void upd.run({ template_id: x.id, is_default: true })} data-testid={`doc-set-default-${x.id}`}>
            {t('setDefault')}
          </button>
        )}
      </span>
      <RowMenu
        id={`doc:${x.id}`}
        dots="v"
        items={[
          { key: 'preview', label: t('preview'), icon: 'ic-eye', onClick: () => void preview.open(x.id) },
          { key: 'edit', label: t('edit'), icon: 'ic-edit', onClick: () => set({ docModal: { id: x.id, source: x.source } }) },
          ...(x.is_default ? [] : [{ key: 'del', label: t('del'), icon: 'ic-trash' as const, danger: true, onClick: () => void del.run({ template_id: x.id }) }]),
        ]}
      />
    </div>
  );
}

export function DocTemplatesSection() {
  const t = useTranslations('settings.doctpl');
  const s = useSectionStyles().styles;
  const { styles, cx } = useDocTplStyles();
  const { docKind, docModal, set } = useSettingsUi();
  const q = useQuery(docTemplatesQuery(docKind));
  const all = useQuery(docTemplatesQuery('all'));
  const editing = docModal?.id ? all.data?.data.find((x) => x.id === docModal.id) : undefined;
  return (
    <>
      <div className={styles.bar}>
        <div className={styles.chips}>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={docKind === k} onClick={() => set({ docKind: k })} data-testid={`doc-kind-${k}`}>
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>
        <button type="button" className={cx(s.ghost, s.sm)} onClick={() => set({ docModal: { source: 'docx' } })} data-testid="doc-upload">
          <Icon name="ic-dl" size={13} color={color.text3} />
          {t('upload')}
        </button>
        <button type="button" className={cx(s.primary, s.sm)} onClick={() => set({ docModal: { source: 'rich' } })} data-testid="doc-new">
          <Icon name="ic-plus" size={13} color={color.white} strokeWidth={2} />
          {t('new')}
        </button>
      </div>
      <div className={s.cardFlush} data-testid="doc-list">
        <div className={cx(s.th, styles.grid)}>
          <span>{t('col.name')}</span>
          <span>{t('col.kind')}</span>
          <span>{t('col.source')}</span>
          <span>{t('col.ver')}</span>
          <span>{t('col.updated')}</span>
          <span>{t('col.default')}</span>
          <span />
        </div>
        <PageStates state={stateOf(q, () => (q.data?.data.length ?? 0) === 0)} onRetry={() => void q.refetch()}>
          {q.data?.data.map((x) => <Row key={x.id} x={x} />)}
        </PageStates>
      </div>
      <div className={styles.note}>
        <Icon name="ic-shield" size={14} color={color.alertText} />
        {t('rule')}
      </div>
      {docModal?.source === 'rich' && (!docModal.id || editing) ? <RichTemplateModal tpl={editing} onClose={() => set({ docModal: null })} /> : null}
      {docModal?.source === 'docx' && (!docModal.id || editing) ? <DocxWizard tpl={editing} onClose={() => set({ docModal: null })} /> : null}
    </>
  );
}
