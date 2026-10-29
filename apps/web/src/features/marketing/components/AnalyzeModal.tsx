// Modal AI phân tích dữ liệu khách hàng — prototype L3568–3662: (1) đang phân tích → (2) bảng đề xuất (GET /campaign-suggestions) → (3) chi tiết.
// "Tạo chiến dịch từ đề xuất" mở wizard với dữ liệu đề xuất (campaign.create kèm suggestion_id). Kênh chỉ Zalo cá nhân + Email.
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, color } from '@appchat/ui';
import { useAnalyzeStyles } from '../styles/analyze.styles';
import { useMarketingUi } from '../marketing-store';
import { suggestionsQuery } from '../api';
import type { MarketingMeta, Suggestion } from '../types';

const LOADING_MS = 900;
const PRI: Record<Suggestion['priority'], [string, string]> = {
  high: [color.hotText, color.dangerSoftBg],
  medium: [color.amberText, color.alertBg],
};
const SIDE_ACTIONS = ['viewList', 'adjust', 'exclude'] as const;
const COLS = ['priority', 'name', 'segment', 'count', 'reason', 'channel', 'when'] as const;

function useChanLabel() {
  const t = useTranslations('marketing');
  return (s: Suggestion) => s.channels.map((c) => t(`chan.${c}`)).join(t('an.and'));
}

function SuggestionList({ rows }: { rows: Suggestion[] }) {
  const t = useTranslations('marketing.an');
  const { styles } = useAnalyzeStyles();
  const set = useMarketingUi((s) => s.set);
  const chan = useChanLabel();
  return (
    <div className={styles.body}>
      <div className={styles.intro}>{t.rich('intro', { n: rows.length, b: (c) => <b>{c}</b> })}</div>
      <div className={styles.table} data-testid="mk-an-table">
        <div className={styles.thead}>
          {COLS.map((k) => (
            <span key={k}>{t(`col.${k}`)}</span>
          ))}
        </div>
        {rows.map((s) => (
          <div key={s.id} className={styles.row} onClick={() => set({ analyze: 'detail', pick: s.id })} data-suggestion={s.id}>
            <span>
              <span className={styles.pri} style={{ color: PRI[s.priority][0], background: PRI[s.priority][1] }}>
                {t(`priority.${s.priority}`)}
              </span>
            </span>
            <span className={styles.b}>
              {s.name}
              {s.used ? <span className={styles.used}>{t('used')}</span> : null}
            </span>
            <span className={styles.soft}>{s.segment}</span>
            <span className={styles.mono}>{s.count.toLocaleString('vi-VN')}</span>
            <span className={styles.why}>{s.reason}</span>
            <span className={styles.soft}>{chan(s)}</span>
            <span className={styles.soft}>{s.when}</span>
          </div>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => set({ analyze: 'loading' })} data-testid="mk-an-rerun">
          <Icon name="ic-spark" size={14} color={color.text3} strokeWidth={2} />
          {t('rerun')}
        </button>
        <span className={styles.grow} />
        <span className={styles.muted}>{t('pickHint')}</span>
      </div>
    </div>
  );
}

function SuggestionDetail({ s }: { s: Suggestion }) {
  const t = useTranslations('marketing.an');
  const { styles } = useAnalyzeStyles();
  const { message } = App.useApp();
  const set = useMarketingUi((st) => st.set);
  const chan = useChanLabel();
  const info: [string, string][] = [
    ['type', s.type],
    ['audience', s.audience],
    ['count', t('countV', { n: s.count.toLocaleString('vi-VN') })],
    ['channel', chan(s)],
    ['time', s.time],
    ['message', s.message],
    ['priority', t(`priority.${s.priority}`)],
  ];
  return (
    <div className={styles.body} data-testid="mk-an-detail">
      <button type="button" className={styles.back} onClick={() => set({ analyze: 'list', pick: null })}>
        {t('back')}
      </button>
      <div className={styles.pitch}>
        <div className={styles.pitchH}>
          <Icon name="ic-spark" size={15} color={color.brandInk} strokeWidth={2} />
          {t('pitch')}
        </div>
        <div className={styles.pitchT}>{s.pitch}</div>
      </div>
      <div className={styles.two}>
        <div className={styles.info}>
          <div className={styles.infoH}>{t('info')}</div>
          {info.map(([k, v]) => (
            <div key={k} className={styles.kv}>
              <span>{t(`k.${k}`)}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
        <div className={styles.side}>
          <div className={styles.box2}>
            <div className={styles.boxL}>{t('forecast')}</div>
            <div className={styles.fc}>{s.forecast}</div>
            <div className={styles.note}>{s.note}</div>
          </div>
          <div className={styles.box2}>
            <div className={styles.boxL}>{t('signals')}</div>
            <div className={styles.tags}>
              {s.signals.map((g) => (
                <span key={g} className={styles.tag}>
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.dFoot}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => set({ analyze: null, wizard: true, fromSuggestion: s.id, prefill: null })}
          data-testid="mk-an-create"
        >
          <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2.2} />
          {t('createFrom')}
        </button>
        {SIDE_ACTIONS.map((k) => (
          <button key={k} type="button" className={styles.ghost} onClick={() => void message.info(t(k))}>
            {t(k)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AnalyzeModal({ meta }: { meta: MarketingMeta }) {
  const t = useTranslations('marketing.an');
  const { styles } = useAnalyzeStyles();
  const stage = useMarketingUi((s) => s.analyze);
  const pick = useMarketingUi((s) => s.pick);
  const set = useMarketingUi((s) => s.set);
  const rows = useQuery({ ...suggestionsQuery(), enabled: stage !== null }).data?.data ?? [];
  // Giai đoạn "đang phân tích" giữ ~1s rồi sang bảng đề xuất (mock không gọi LLM).
  useEffect(() => {
    if (stage !== 'loading') return;
    const h = setTimeout(() => set({ analyze: 'list' }), LOADING_MS);
    return () => clearTimeout(h);
  }, [stage, set]);
  if (!stage) return null;
  const s = rows.find((r) => r.id === pick);
  const sub = stage === 'loading' ? t('subLoading') : stage === 'list' ? t('subList', { n: rows.length }) : t('subDetail');
  const close = () => set({ analyze: null, pick: null });
  return (
    <div className={styles.veil} onClick={close} data-testid="mk-analyze-modal">
      <div className={styles.box} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.hIc}>
            <Icon name="ic-spark" size={18} color={color.sparkMint} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.hT}>{t('title')}</div>
            <div className={styles.hS}>{sub}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        {stage === 'loading' ? (
          <div className={styles.loading}>
            <div className={styles.spinRow}>
              <span className={styles.spinner} />
              {t('loading')}
            </div>
            <div className={styles.signals}>
              {meta.signals.map((g) => (
                <div key={g} className={styles.signal}>
                  <span className={styles.sigOk}>
                    <Icon name="ic-check" size={11} color={color.brand} strokeWidth={3} />
                  </span>
                  {g}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {stage === 'list' ? <SuggestionList rows={rows} /> : null}
        {stage === 'detail' && s ? <SuggestionDetail s={s} /> : null}
      </div>
    </div>
  );
}
