// Hiển thị một đề xuất đã kiểm theo đúng khuôn của kỹ năng (TIP-019c §1, §4.3) — nhận dạng theo trường, render chữ thuần (React escape),
// không bao giờ dangerouslySetInnerHTML / JSON thô. Bằng chứng = trích dẫn cắt từ nguồn thật (server đã kiểm offset).
'use client';
import { useTranslations } from 'next-intl';
import type { DetectIntentProposal, Evidence, ExtractInfoProposal, ScoreLeadProposal, SummarizeProposal } from '@appchat/shared';
import { useUtilityStyles } from '../styles';

type T = (k: string, v?: Record<string, unknown>) => string;
const isSummary = (p: unknown): p is SummarizeProposal => !!p && typeof p === 'object' && 'summary' in p;
const isIntent = (p: unknown): p is DetectIntentProposal => !!p && typeof p === 'object' && 'label' in p && 'taxonomy_version' in p;
const isExtract = (p: unknown): p is ExtractInfoProposal => !!p && typeof p === 'object' && 'fields' in p && 'missing_required' in p;
const isLead = (p: unknown): p is ScoreLeadProposal => !!p && typeof p === 'object' && 'rubric_version' in p;

const show = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? '✓' : '✗') : String(v));

/** Bản chữ để sao chép — cùng nội dung đang hiển thị, không thêm gì. */
export function proposalText(p: unknown, t: T): string {
  if (isSummary(p)) return [p.summary, ...p.bullets.map((b) => `• ${b}`)].join('\n');
  if (isIntent(p)) return `${t('intent')}: ${t(`intents.${p.label}`)}`;
  if (isExtract(p)) return p.fields.map((f) => `${f.key}: ${show(f.value)} (${t(`status.${f.status}`)})`).join('\n');
  if (isLead(p)) return `${t('lead')}: ${p.score ?? t('insufficient')}\n${p.criteria.map((c) => `${t(`criteria.${c.key}`)}: ${c.score ?? '—'}`).join('\n')}`;
  return '';
}

function Quotes({ ev }: { ev: Evidence[] }) {
  const { styles } = useUtilityStyles();
  return (
    <>
      {ev.map((e, i) => (
        <blockquote key={i} className={styles.quote} data-testid="utility-evidence">
          {e.quote}
        </blockquote>
      ))}
    </>
  );
}

function Uncertain({ items }: { items: string[] }) {
  const t = useTranslations('assistant.utility');
  const { styles } = useUtilityStyles();
  if (!items.length) return null;
  return (
    <>
      <div className={styles.section}>{t('uncertain')}</div>
      {items.map((u, i) => (
        <div key={i} className={styles.hint}>
          {u}
        </div>
      ))}
    </>
  );
}

export function ProposalView({ proposal: p }: { proposal: unknown }) {
  const t = useTranslations('assistant.utility');
  const { styles } = useUtilityStyles();
  if (isSummary(p))
    return (
      <div data-testid="utility-summary">
        <div className={styles.value}>{p.summary}</div>
        {p.bullets.map((b, i) => (
          <div key={i} className={styles.msg}>
            • {b}
          </div>
        ))}
        <Quotes ev={p.evidence} />
        <Uncertain items={p.uncertainties} />
      </div>
    );
  if (isIntent(p))
    return (
      <div data-testid="utility-intent">
        <div className={styles.value}>{t(`intents.${p.label}` as never)}</div>
        <Quotes ev={p.evidence} />
        <Uncertain items={p.uncertainties} />
      </div>
    );
  if (isExtract(p))
    return (
      <div data-testid="utility-extract">
        {p.origin === 'caller_supplied' ? <div className={styles.hint}>{t('unverified')}</div> : null}
        {p.fields.map((f) => (
          <div key={f.key} data-testid={`utility-extract-${f.key}`}>
            <div className={styles.msg}>
              <span className={styles.grow}>{f.key}</span>
              <span className={styles.value}>{show(f.value)}</span>
              <span className={styles.hint}>{t(`status.${f.status}` as never)}</span>
            </div>
            {f.reason_code ? <div className={styles.hint}>{t(`reason.${f.reason_code}` as never)}</div> : null}
            <Quotes ev={f.evidence} />
          </div>
        ))}
      </div>
    );
  if (isLead(p))
    return (
      <div data-testid="utility-lead">
        <div className={styles.value}>{p.score === null ? t('insufficient') : t('score', { n: p.score })}</div>
        <div className={styles.hint}>{t('leadDisclaimer')}</div>
        {p.criteria.map((c) => (
          <div key={c.key}>
            <div className={styles.msg}>
              <span className={styles.grow}>{t(`criteria.${c.key}` as never)}</span>
              <span className={styles.value}>{c.score ?? '—'}</span>
            </div>
            {c.reason ? <div className={styles.hint}>{c.reason}</div> : null}
            <Quotes ev={c.evidence} />
          </div>
        ))}
        <Uncertain items={p.uncertainties} />
      </div>
    );
  return <div className={styles.hint}>{t('state.unknown')}</div>;
}
