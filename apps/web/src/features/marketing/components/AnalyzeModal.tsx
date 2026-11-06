// Modal AI phân tích dữ liệu khách hàng — prototype L3568–3662: (1) đang phân tích (lượt thật — hooks/useCampaignAnalysis) → (2) bảng
// gợi ý đã lưu (GET /campaign-suggestions) → (3) chi tiết. Số khách của gợi ý là số đếm thật theo bộ lọc đã kiểm (server), không do model
// tự khai. "Tạo chiến dịch từ đề xuất" mở wizard (campaign.create kèm suggestion_id — tập khách = bộ lọc gợi ý). Không có dự báo giả.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useCan } from '@/shared/authz/useCan';
import { useAnalyzeStyles } from '../styles/analyze.styles';
import { useMarketingUi } from '../marketing-store';
import { suggestionsQuery } from '../api';
import { useCampaignAnalysis } from '../hooks/useCampaignAnalysis';
import type { MarketingMeta, Suggestion } from '../types';
import { segmentSummary } from '../segment-summary';

const COLS = ['kind', 'name', 'segment', 'count', 'reason', 'channel', 'when'] as const;
/** Màu nhãn loại gợi ý (cùng bảng màu panel AI). */
const KIND_TONE: Record<string, [string, string]> = {
  reactivation: [color.hotText, color.dangerSoftBg],
  upsell: [color.hotText, color.dangerSoftBg],
  conversion: [color.amberText, color.alertBg],
  aftercare: [color.amberText, color.alertBg],
};

function SuggestionList({ rows, onRerun, busy }: { rows: Suggestion[]; onRerun: () => void; busy: boolean }) {
  const t = useTranslations('marketing');
  const fmt = useFmt();
  const { styles } = useAnalyzeStyles();
  const set = useMarketingUi((s) => s.set);
  const canRun = useCan('campaign.manage');
  return (
    <div className={styles.body}>
      <div className={styles.intro}>{rows.length ? t.rich('an.intro', { n: rows.length, b: (c) => <b>{c}</b> }) : t('an.none')}</div>
      <div className={styles.table} data-testid="mk-an-table">
        <div className={styles.thead}>
          {COLS.map((k) => (
            <span key={k}>{t(`an.col.${k}`)}</span>
          ))}
        </div>
        {rows.map((s) => (
          <div key={s.id} className={styles.row} onClick={() => set({ analyze: 'detail', pick: s.id })} data-suggestion={s.id}>
            <span>
              <span className={styles.pri} style={{ color: (KIND_TONE[s.kind] ?? KIND_TONE.conversion!)[0], background: (KIND_TONE[s.kind] ?? KIND_TONE.conversion!)[1] }}>
                {t(`an.kind.${s.kind}`)}
              </span>
            </span>
            <span className={styles.b}>
              {s.title}
              {s.status === 'used' ? <span className={styles.used}>{t('an.used')}</span> : null}
            </span>
            <span className={styles.soft}>{segmentSummary(s.filter, t, (v) => fmt.money(v))}</span>
            <span className={styles.mono}>{fmt.number(s.est_count)}</span>
            <span className={styles.why}>{s.reason}</span>
            <span className={styles.soft}>{t(`chan.${s.channel}`)}</span>
            <span className={styles.soft}>{s.best_time ?? t('an.anyTime')}</span>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        {canRun ? (
          <button type="button" className={styles.ghost} disabled={busy} onClick={onRerun} data-testid="mk-an-rerun">
            <Icon name="ic-spark" size={14} color={color.text3} strokeWidth={2} />
            {rows.length ? t('an.rerun') : t('an.run')}
          </button>
        ) : null}
        <span className={styles.grow} />
        <span className={styles.muted}>{t('an.pickHint')}</span>
      </div>
    </div>
  );
}

function SuggestionDetail({ s }: { s: Suggestion }) {
  const t = useTranslations('marketing');
  const fmt = useFmt();
  const { styles } = useAnalyzeStyles();
  const set = useMarketingUi((st) => st.set);
  const canCreate = useCan('campaign.manage');
  const info: [string, string][] = [
    ['type', t(`an.kind.${s.kind}`)],
    ['count', t('an.countV', { n: fmt.number(s.est_count) })],
    ['channel', t(`chan.${s.channel}`)],
    ['time', s.best_time ?? t('an.anyTime')],
    ['message', s.subject || s.body.slice(0, 80)],
    ['cta', s.cta || '—'],
  ];
  return (
    <div className={styles.body} data-testid="mk-an-detail">
      <button type="button" className={styles.back} onClick={() => set({ analyze: 'list', pick: null })}>
        {t('an.back')}
      </button>
      <div className={styles.pitch}>
        <div className={styles.pitchH}>
          <Icon name="ic-spark" size={15} color={color.brandInk} strokeWidth={2} />
          {s.title}
        </div>
        <div className={styles.pitchT}>{s.reason}</div>
      </div>
      <div className={styles.two}>
        <div className={styles.info}>
          <div className={styles.infoH}>{t('an.info')}</div>
          {info.map(([k, v]) => (
            <div key={k} className={styles.kv}>
              <span>{t(`an.k.${k}`)}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <div className={styles.side}>
          <div className={styles.box2}>
            <div className={styles.boxL}>{t('an.bodyL')}</div>
            <div className={styles.note}>{s.body}</div>
          </div>
          <div className={styles.box2}>
            <div className={styles.boxL}>{t('an.generated')}</div>
            <div className={styles.note}>{`${fmt.date(s.generated_at)} · ${fmt.time(s.generated_at)}`}</div>
          </div>
        </div>
      </div>
      <div className={styles.dFoot}>
        {canCreate ? (
          <button type="button" className={styles.primary} onClick={() => set({ analyze: null, wizard: true, fromSuggestion: s.id, prefill: null })} data-testid="mk-an-create">
            <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2.2} />
            {t('an.createFrom')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AnalyzeModal({ meta }: { meta: MarketingMeta }) {
  const t = useTranslations('marketing');
  const { styles } = useAnalyzeStyles();
  const stage = useMarketingUi((s) => s.analyze);
  const pick = useMarketingUi((s) => s.pick);
  const set = useMarketingUi((s) => s.set);
  const a = useCampaignAnalysis();
  const rows = useQuery({ ...suggestionsQuery(), enabled: stage !== null }).data ?? [];
  if (!stage) return null;
  const s = rows.find((r) => r.id === pick);
  const sub = stage === 'running' ? t('an.subLoading') : stage === 'list' ? t('an.subList', { n: rows.length }) : t('an.subDetail');
  const close = () => set({ analyze: null, pick: null });
  return (
    <div className={styles.veil} onClick={close} data-testid="mk-analyze-modal">
      <div className={styles.box} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.hIc}>
            <Icon name="ic-spark" size={18} color={color.sparkMint} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.hT}>{t('an.title')}</div>
            <div className={styles.hS}>{sub}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('an.close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        {stage === 'running' ? (
          <div className={styles.loading} data-testid="mk-an-running">
            <div className={styles.spinRow}>
              {a.failed ? null : <span className={styles.spinner} />}
              {a.failed ? t('an.failed') : t('an.loading')}
            </div>
            <div className={styles.signals}>
              {meta.signals.map((g) => (
                <div key={g} className={styles.signal}>
                  <span className={styles.sigOk}>
                    <Icon name="ic-check" size={11} color={color.brand} strokeWidth={3} />
                  </span>
                  {t(`an.signal.${g}`)}
                </div>
              ))}
            </div>
            {a.failed ? (
              <button type="button" className={styles.ghost} onClick={() => set({ analyze: 'list', runId: null })} data-testid="mk-an-back">
                {t('an.back')}
              </button>
            ) : null}
          </div>
        ) : null}
        {stage === 'list' ? <SuggestionList rows={rows} onRerun={() => void a.start()} busy={a.starting} /> : null}
        {stage === 'detail' && s ? <SuggestionDetail s={s} /> : null}
      </div>
    </div>
  );
}
