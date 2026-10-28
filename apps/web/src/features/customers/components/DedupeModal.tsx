// Modal "Kiểm tra trùng lặp" — prototype L2626–2682 (880px). "CLAUDE GỢI Ý" → "AI GỢI Ý" (D29). Gộp qua contact.merge (bulk → xác nhận).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useDedupeStyles } from '../styles/dedupe.styles';
import { useFormStyles } from '../styles/form.styles';
import { useCrmUi } from '../crm-store';
import { duplicatesQuery } from '../api';
import type { DupSide } from '../types';

const PCT_TONE = (p: number) => (p >= 90 ? [color.roseBg, color.dangerDeep] : p >= 80 ? [color.tierSoftBg, color.amberText] : [color.lookupBg, color.violetInk]);
const NO_MATCH = /(0|999|test|xxx|9999)/;

export function DedupeModal() {
  const t = useTranslations('customers.dd');
  const router = useRouter();
  const { styles, cx } = useDedupeStyles();
  const { styles: fs } = useFormStyles();
  const ui = useCrmUi();
  const data = useQuery(duplicatesQuery()).data;
  const merge = useAction('contact.merge');
  const [q, setQ] = useState('');
  const [searched, setSearched] = useState(false);
  const close = () => ui.set({ modal: null });
  const noMatch = searched && q.trim().length > 0 && NO_MATCH.test(q.toLowerCase());
  const groups = data?.groups ?? [];
  const s = data?.summary;

  const side = (r: DupSide, primary: boolean) => (
    <div className={cx(styles.rec, primary && styles.recLine)}>
      <div className={styles.recName}>
        <span className={cx(styles.radio, primary && styles.radioOn)} />
        {r.name}
      </div>
      <span className={styles.email}>{r.email}</span>
      <span className={styles.phone}>{r.phone}</span>
      <span className={styles.src}>{r.src}</span>
    </div>
  );

  return (
    <ModalShell
      open
      onClose={close}
      width={880}
      title={t('title')}
      icon="ic-filter"
      iconColor={color.dangerDeep}
      iconBg={color.dangerSoftBg}
      closeLabel={t('close')}
      testId="crm-dedupe-modal"
      footer={
        <>
          <button type="button" className={cx(fs.btn, fs.btnFoot)} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(fs.btn, fs.btnFoot, fs.primary)} onClick={async () => groups.length && (await merge.run({ group_ids: groups.map((g) => g.id) })) && close()}>
            {t('mergeSelected')}
          </button>
        </>
      }
    >
      <div className={styles.search}>
        <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} />
        <input
          className={styles.searchInput}
          value={q}
          placeholder={t('search')}
          aria-label={t('search')}
          onChange={(e) => {
            setQ(e.target.value);
            setSearched(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && setSearched(true)}
        />
        <button type="button" className={styles.run} onClick={() => setSearched(true)}>
          {t('run')}
        </button>
      </div>
      {noMatch ? (
        <div className={styles.none} data-testid="dd-no-match">
          <span className={styles.noneIcon}>
            <Icon name="ic-search" size={20} color={color.amberGold} strokeWidth={1.7} />
          </span>
          <div className={styles.noneTitle}>{t('noMatch')}</div>
          <div className={styles.noneBody}>{t.rich('noMatchBody', { q, b: (c) => <b>{c}</b> })}</div>
          <div className={styles.noneActs}>
            <button type="button" className={fs.btn} onClick={close}>
              {t('later')}
            </button>
            <button type="button" className={cx(fs.btn, fs.primary)} onClick={() => ui.open('ai')}>
              <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
              {t('createAi')}
            </button>
          </div>
        </div>
      ) : null}
      <div className={styles.summary}>
        <div className={styles.sum} style={{ background: color.dupBg, borderColor: color.dupLine }}>
          <div className={styles.sumLabel} style={{ color: color.dangerDeep }}>
            {t('suspect')}
          </div>
          <div className={styles.sumBig}>{t('suspectVal', { groups: s?.groups ?? 0, records: s?.records ?? 0 })}</div>
        </div>
        <div className={styles.sum} style={{ background: color.ruleBg, borderColor: color.ruleLine }}>
          <div className={styles.sumLabel} style={{ color: color.blue }}>
            {t('rules')}
          </div>
          <div className={styles.sumText}>{t('rulesVal')}</div>
        </div>
        <div className={styles.sum} style={{ background: color.brandBg, borderColor: color.brandBorder }}>
          <div className={styles.sumLabel} style={{ color: color.brandInk }}>
            {t('aiSuggest')}
          </div>
          <div className={styles.sumText}>{t('aiSuggestVal', { auto: s?.auto ?? 0, groups: s?.groups ?? 0 })}</div>
        </div>
      </div>
      {groups.map((g) => {
        const [bg, fg] = PCT_TONE(g.pct);
        return (
          <div key={g.id} className={styles.group} data-testid="dd-group">
            <div className={styles.groupHead}>
              <span className={styles.pct} style={{ background: bg, color: fg }}>
                {t('pct', { pct: g.pct })}
              </span>
              <span className={styles.by}>
                {t('by')} <b>{g.by}</b>
              </span>
              <span className={styles.grow} />
              <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => router.push('/calendar')}>
                {t('booking')}
              </button>
              <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => router.push('/tickets')}>
                {t('ticket')}
              </button>
              <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => ui.open('transfer')}>
                {t('transfer')}
              </button>
              <button type="button" className={cx(fs.btn, fs.btnSm, fs.primary)} onClick={() => void merge.run({ group_ids: [g.id] })}>
                {t('merge')}
              </button>
            </div>
            {side(g.a, true)}
            {side(g.b, false)}
          </div>
        );
      })}
    </ModalShell>
  );
}
