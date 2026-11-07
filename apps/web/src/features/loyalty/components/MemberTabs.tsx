// Nội dung tab drawer thành viên — prototype L4677–4731: Tổng quan (tiến độ hạng, chỉ số, nút) · CRM (thang hạng theo COMMERCE §7) ·
// Lịch sử điểm (loyalty_ledger). Tab AI ở MemberAiTab.tsx, tab Tệp ở MemberFilesTab.tsx (TIP-036).
'use client';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useDrawerStyles } from '../styles/drawer.styles';
import { useLadderStyles } from '../styles/ladder.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { loyaltyConfigQuery } from '../api';
import { TIER_TONE, pts } from '../status';
import type { Member } from '../types';

const KIND: Record<string, [IconName, string]> = {
  earn: ['ic-plus', color.successStrong],
  redeem: ['ic-gift', color.dangerStrong],
  adjust: ['ic-refresh', color.blue],
  expire: ['ic-clock', color.text3],
  reverse: ['ic-refresh', color.amberText],
  restore: ['ic-refresh', color.successStrong],
};
const CUSTOMERS = '/customers';
const PLUS = '+';
const signed = (n: number) => (n > 0 ? PLUS : '') + pts(n);

export function useLadder(m: Member) {
  const cfg = useQuery(loyaltyConfigQuery()).data;
  const tiers = cfg?.tiers ?? [];
  const i = tiers.findIndex((x) => x.key === m.tier);
  const cur = tiers[i];
  const next = tiers[i + 1];
  const prog = next && cur ? Math.min(100, Math.round(((m.earned - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { tiers, next, need: next ? Math.max(0, next.min - m.earned) : 0, prog };
}

export function OverviewTab({ m }: { m: Member }) {
  const t = useTranslations('loyalty');
  const { styles, cx } = useDrawerStyles();
  const router = useRouter();
  const set = useLoyaltyUi((s) => s.set);
  const canAdjust = useCan('loyalty.adjust');
  const { next, need, prog } = useLadder(m);
  const fmt = useFmt();
  return (
    <>
      <div className={styles.card}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>{t('dr.progress')}</span>
          <span className={styles.grow} />
          {next ? null : <span className={styles.maxTag}>{t('dr.maxTag')}</span>}
        </div>
        {next ? (
          <>
            <div className={styles.upRow}>
              <span>{t.rich('dr.up', { t: t(`tier.${next.key}`), b: (c) => <b>{c}</b> })}</span>
              <span className={styles.grow} />
              <span className={styles.need}>{t('dr.need', { n: pts(need) })}</span>
            </div>
            <div className={styles.bar}>
              <div style={{ width: `${prog}%` }} />
            </div>
          </>
        ) : (
          <div className={styles.text}>{t('dr.maxD')}</div>
        )}
      </div>
      <div className={styles.card}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>{t('dr.stats')}</span>
        </div>
        <div className={styles.kv}>
          <span>{t('dr.used')}</span>
          <b>{pts(m.used)}</b>
        </div>
        {m.expiring ? (
          <div className={styles.kv}>
            <span>{t('dr.expiring')}</span>
            <b>{pts(m.expiring)}</b>
          </div>
        ) : null}
        <div className={styles.kv}>
          <span>{t('dr.spent')}</span>
          <b className={styles.green}>{fmt.money(m.spent)}</b>
        </div>
      </div>
      <div className={styles.btns}>
        {canAdjust ? (
          <button type="button" className={styles.btn} onClick={() => set({ adjust: true, adjustFor: m.phone })} data-testid="ly-dr-adjust">
            <Icon name="ic-gift" size={15} color={color.amberGold} />
            {t('dr.adjust')}
          </button>
        ) : null}
        <button type="button" className={cx(styles.btn)} onClick={() => router.push(CUSTOMERS)}>
          <Icon name="ic-users" size={15} color={color.text3} />
          {t('dr.openCrm')}
        </button>
      </div>
    </>
  );
}

export function LadderTab({ m }: { m: Member }) {
  const t = useTranslations('loyalty');
  const { styles, cx } = useDrawerStyles();
  const l = useLadderStyles().styles;
  const { tiers } = useLadder(m);
  return (
    <>
      <div className={cx(styles.text, styles.card)}>{t.rich('dr.ladderD', { b: (c) => <b>{c}</b> })}</div>
      {tiers.map((x) => {
        const tone = TIER_TONE[x.key] ?? color.slateAvatar;
        const on = x.key === m.tier;
        return (
          <div key={x.key} className={cx(l.rung, on && l.rungOn)} data-rung={x.key}>
            <div className={l.rungH}>
              <span className={l.dot} style={{ background: tone }} />
              <span className={l.rungT}>{t(`tier.${x.key}`)}</span>
              {on ? <span className={l.cur}>{t('dr.current')}</span> : null}
              <span className={styles.grow} />
              <span className={l.rate} style={{ color: tone }}>
                {t('dr.rate', { m: String(x.mult).replace('.', ',') })}
              </span>
            </div>
            <div className={l.from}>{t('dr.from', { n: pts(x.min) })}</div>
            <div className={l.perk}>{t(`dr.perk.${x.key}`)}</div>
          </div>
        );
      })}
    </>
  );
}

export function HistoryTab({ m }: { m: Member }) {
  const t = useTranslations('loyalty.dr');
  const { styles } = useDrawerStyles();
  if (!m.ledger.length) return <div className={styles.text}>{t('noHistory')}</div>;
  return (
    <div data-testid="ly-history">
      {m.ledger.map((h, i) => {
        const [ic, c] = KIND[h.kind] ?? KIND.adjust!;
        return (
          <div key={h.id ?? `${h.text}${i}`} className={styles.hist} data-ledger={h.kind}>
            <span className={styles.histIc} style={{ background: `${c}14` }}>
              <Icon name={ic} size={16} color={c} strokeWidth={1.9} />
            </span>
            <div className={styles.grow}>
              <div className={styles.histT}>{h.text}</div>
              <div className={styles.histS}>{`${t(`kind.${h.kind}`)} · ${h.at}`}</div>
            </div>
            <span className={styles.histD} style={{ color: h.delta > 0 ? color.successStrong : color.dangerStrong }}>
              {signed(h.delta)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
