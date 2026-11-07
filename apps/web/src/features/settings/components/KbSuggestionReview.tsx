// Drawer duyệt một đề xuất tri thức (TIP-043, PD-013 — prototype không có): sửa câu hỏi / câu trả lời (đã che dữ liệu khách), chọn thư mục +
// "Ai được dùng" (bỏ trống = theo thư mục, server quyết), Duyệt → nguồn "từ hội thoại" (AI học sau khi nạp xong) / Từ chối kèm lý do.
// Bản đề xuất gốc hiện để so sánh khi đã sửa. Lỗi: còn SĐT / email → báo dưới ô; người khác vừa duyệt → cảnh báo + tải lại hàng chờ.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { KB_SUGGESTION_LIMITS, type KbSuggestionDto } from '@appchat/shared';
import { EntityDrawer } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useRagModalStyles } from '../styles/rag-modal.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { useRagReviewStyles } from '../styles/rag-review.styles';
import { useKbReview } from '../hooks/useKbSuggestions';
import type { KbFolder } from '../types';

type Vis = 'public' | 'internal';
const INHERIT = '';
const VIS_OPTS = [INHERIT, 'public', 'internal'] as const;

export function KbSuggestionReview({ s, folders, onClose }: { s: KbSuggestionDto; folders: KbFolder[]; onClose: () => void }) {
  const t = useTranslations('settings.rag.review');
  const sec = useSectionStyles().styles;
  const { styles: m, cx } = useRagModalStyles();
  const cm = useChannelManageStyles().styles;
  const r = useRagReviewStyles().styles;
  const [question, setQuestion] = useState(s.question);
  const [answer, setAnswer] = useState(s.answer);
  const [folder, setFolder] = useState('');
  const [vis, setVis] = useState<Vis | typeof INHERIT>(INHERIT);
  const [reason, setReason] = useState('');
  const [errs, setErrs] = useState<Partial<Record<'question' | 'answer', string>>>({});
  const review = useKbReview((field, code) => setErrs((e) => ({ ...e, [field]: code.startsWith('sensitive_data') ? t('sensitive') : t(`err.${code}` as never) })));
  const pending = s.status === 'pending';
  const edited = question.trim() !== s.question || answer.trim() !== s.answer;
  const ok = !!question.trim() && !!answer.trim();
  const approve = async () => {
    setErrs({});
    const done = await review.approve({
      suggestion_id: s.id,
      if_version: s.version,
      ...(question.trim() !== s.question ? { question: question.trim() } : {}),
      ...(answer.trim() !== s.answer ? { answer: answer.trim() } : {}),
      ...(folder ? { folder_id: folder } : {}),
      ...(vis ? { visibility: vis } : {}),
    });
    if (done) onClose();
  };
  const reject = async () => {
    if (await review.reject({ suggestion_id: s.id, if_version: s.version, ...(reason.trim() ? { reason: reason.trim() } : {}) })) onClose();
  };
  return (
    <EntityDrawer
      open
      onClose={onClose}
      title={t('title')}
      icon="ic-spark"
      closeLabel={t('close')}
      width={520}
      testId="st-kbsug-drawer"
      footer={
        pending ? (
          <div className={cm.foot}>
            <button type="button" className={cx(sec.dangerGhost, r.touch)} onClick={() => void reject()} disabled={review.busy} data-testid="st-kbsug-reject">
              {t('reject')}
            </button>
            <span className={cm.grow} />
            <button type="button" className={sec.ghost} onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="button" className={sec.primary} onClick={() => void approve()} disabled={review.busy || !ok} data-testid="st-kbsug-approve">
              {t('approve')}
            </button>
          </div>
        ) : undefined
      }
    >
      <div className={cm.stack}>
        <label>
          <div className={sec.label}>{t('question')}</div>
          <input className={sec.input} value={question} maxLength={KB_SUGGESTION_LIMITS.question} disabled={!pending} onChange={(e) => setQuestion(e.target.value)} autoFocus aria-invalid={!!errs.question} data-testid="st-kbsug-question" />
          {errs.question ? <div className={r.err} role="alert">{errs.question}</div> : null}
        </label>
        <label>
          <div className={sec.label}>{t('answer')}</div>
          <textarea className={cx(sec.input, r.area)} value={answer} maxLength={KB_SUGGESTION_LIMITS.answer} disabled={!pending} onChange={(e) => setAnswer(e.target.value)} aria-invalid={!!errs.answer} data-testid="st-kbsug-answer" />
          {errs.answer ? <div className={r.err} role="alert">{errs.answer}</div> : null}
        </label>
        {edited ? (
          <div>
            <div className={sec.label}>{t('original')}</div>
            <div className={r.orig} data-testid="st-kbsug-original">{`${s.question}\n${s.answer}`}</div>
          </div>
        ) : null}
        {pending ? (
          <>
            <label>
              <div className={sec.label}>{t('folder')}</div>
              <select className={sec.select} value={folder} onChange={(e) => setFolder(e.target.value)} data-testid="st-kbsug-folder">
                <option value="">{t('noFolder')}</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <div className={sec.label}>{t('visibility')}</div>
              <div className={m.seg} role="radiogroup" aria-label={t('visibility')} data-testid="st-kbsug-vis">
                {VIS_OPTS.map((v) => (
                  <button key={v || 'inherit'} type="button" role="radio" aria-checked={vis === v} className={cx(m.segBtn, vis === v && m.segOn)} onClick={() => setVis(v)} data-testid={`st-kbsug-vis-${v || 'inherit'}`}>
                    {t(`vis.${v || 'inherit'}`)}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <div className={sec.label}>{t('reason')}</div>
              <input className={sec.input} value={reason} maxLength={KB_SUGGESTION_LIMITS.reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonPh')} data-testid="st-kbsug-reason" />
            </label>
          </>
        ) : (
          <div className={sec.muted} data-testid="st-kbsug-done">
            {s.status === 'approved' ? t('doneApproved', { by: s.reviewed_by_name ?? '—' }) : t('doneRejected', { by: s.reviewed_by_name ?? '—', reason: s.reject_reason ?? '—' })}
          </div>
        )}
      </div>
    </EntityDrawer>
  );
}
