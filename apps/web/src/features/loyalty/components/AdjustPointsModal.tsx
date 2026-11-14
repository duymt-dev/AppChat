// Hộp "Thêm thành viên & ghi nhận điểm" (600px) — prototype L4492–4580: (1) Tra SĐT → (2) Xác định hạng (thành viên có sẵn / khách CRM / khách mới)
// → (3) Ghi nhận điểm. Theo COMMERCE §7 bước 3 là điều chỉnh tay ± + 1 trong 7 lý do (loyalty.adjust_points, hoàn tác 24h); kết quả hiện số dư
// và hạng sau điều chỉnh. Khách mới không chọn "Hạng khởi tạo".
'use client';
import { useTranslations } from 'next-intl';
import { ADJUST_REASONS } from '@appchat/actions';
import { Icon, color } from '@appchat/ui';
import { useModalStyles } from '../styles/modal.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { useAdjust, type AdjustDir } from '../hooks/useAdjust';
import {TIER_TONE, avColor, initial } from '../status';
import { useFmt } from '@/shared/i18n/useFmt';

const DIRS: AdjustDir[] = ['plus', 'minus'];
const REQ = '*';

export function AdjustPointsModal() {
  const open = useLoyaltyUi((s) => s.adjust);
  const phone = useLoyaltyUi((s) => s.adjustFor);
  if (!open) return null;
  return <Adjust key={phone ?? ''} initialPhone={phone ?? ''} />;
}

function Steps({ step }: { step: number }) {
  const t = useTranslations('loyalty.adj');
  const { styles } = useModalStyles();
  const labels = t.raw('steps') as string[];
  return (
    <div className={styles.steps}>
      {labels.map((l, i) => {
        const on = i + 1 <= step;
        return (
          <div key={l} className={styles.step} data-step-on={on}>
            <span className={styles.stepN} style={{ background: on ? color.brand : color.border, color: on ? color.white : color.text4 }}>
              {i + 1}
            </span>
            <span className={styles.stepL} style={{ color: on ? color.brandInk : color.text4 }}>
              {l}
            </span>
            <span className={styles.stepLine} style={{ background: on ? color.activeLine : color.divider }} />
          </div>
        );
      })}
    </div>
  );
}

function Adjust({ initialPhone }: { initialPhone: string }) {
  const fmt = useFmt();
  const t = useTranslations('loyalty');
  const { styles, cx } = useModalStyles();
  const a = useAdjust(initialPhone);
  const m = a.found?.member;
  const isNew = !!a.found && !m;
  const ladder = a.cfg?.tiers ?? [];
  const ti = m ? ladder.findIndex((x) => x.key === m.tier) : -1;
  const next = ti >= 0 ? ladder[ti + 1] : undefined;
  const tone = m ? (TIER_TONE[m.tier] ?? color.slateAvatar) : color.slateAvatar;
  const hint = !a.found ? t('adj.hintStart') : m ? t('adj.hintMember') : t('adj.hintNew');
  return (
    <div className={styles.veil} onClick={a.close} data-testid="ly-adjust">
      <div className={cx(styles.box, styles.w600)} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hT}>{t('adj.title')}</div>
            <div className={styles.hS}>{t('adj.sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={a.close} aria-label={t('adj.close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <Steps step={a.step} />
        <div className={styles.body}>
          <div>
            <div className={styles.label}>{t('adj.phone')}</div>
            <div className={styles.row}>
              <input
                className={styles.input}
                value={a.phone}
                onChange={(e) => a.setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void a.lookup()}
                placeholder={t('adj.phonePh')}
                inputMode="numeric"
                aria-label={t('adj.phone')}
                data-testid="ly-adj-phone"
              />
              <button type="button" className={styles.lookup} onClick={() => void a.lookup()} data-testid="ly-adj-lookup">
                {t('adj.lookup')}
              </button>
            </div>
            <div className={styles.hint}>{t.rich('adj.tryHint', { b: (c) => <b>{c}</b> })}</div>
          </div>
          {m ? (
            <div className={styles.found} data-testid="ly-adj-found">
              <div className={styles.foundRow}>
                <span className={styles.av} style={{ background: avColor(m.name) }}>
                  {initial(m.name)}
                </span>
                <div className={styles.grow}>
                  <div className={styles.fName}>{m.name}</div>
                  <div className={styles.fSub}>{t('adj.member', { d: m.joined })}</div>
                </div>
                <div className={styles.right}>
                  <span className={styles.tier} style={{ background: `${tone}18`, color: tone }}>
                    {t('adj.tierBadge', { t: t(`tier.${m.tier}`) })}
                  </span>
                  <div>
                    {`${t('adj.cur')} `}
                    <b>{fmt.number(m.points)}</b>
                  </div>
                </div>
              </div>
              <div className={styles.next}>
                {next
                  ? t.rich('adj.toNext', { n: fmt.number(Math.max(0, next.min - m.earned)), t: t(`tier.${next.key}`), b: (c) => <b>{c}</b> })
                  : t('adj.maxTier')}
              </div>
            </div>
          ) : null}
          {isNew ? (
            <>
              <div className={styles.newBox} data-testid="ly-adj-new">
                <div className={styles.newT}>{t('adj.newT')}</div>
                <div className={styles.newD}>
                  {a.found?.contact
                    ? t.rich('adj.crmD', { name: a.found.contact.name, b: (c) => <b>{c}</b> })
                    : t.rich('adj.newD', { b: (c) => <b>{c}</b> })}
                </div>
              </div>
              {a.found?.contact ? null : (
                <div>
                  <div className={styles.label}>{t('adj.name')}</div>
                  <input className={styles.input} value={a.name} onChange={(e) => a.setName(e.target.value)} placeholder={t('adj.namePh')} data-testid="ly-adj-name" />
                </div>
              )}
            </>
          ) : null}
          {a.found ? (
            <div className={styles.panel}>
              <div className={styles.tagRow}>
                <span className={styles.tag}>{t('adj.box')}</span>
                <span className={styles.muted}>{t('adj.boxSub')}</span>
              </div>
              <div className={styles.two}>
                <div>
                  <div className={styles.label}>{t('adj.dir')}</div>
                  <select className={styles.select} value={a.dir} onChange={(e) => a.setDir(e.target.value as AdjustDir)} data-testid="ly-adj-dir">
                    {DIRS.map((d) => (
                      <option key={d} value={d}>
                        {t(`adj.${d}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className={styles.label}>{t('adj.points')}</div>
                  <input className={styles.input} value={a.amount} onChange={(e) => a.setAmount(e.target.value)} inputMode="numeric" data-testid="ly-adj-points" />
                </div>
              </div>
              <div className={styles.two}>
              <div>
                <div className={styles.label}>
                  {t('adj.reason')} <span className={styles.req}>{REQ}</span>
                </div>
                <select className={styles.select} value={a.reason} onChange={(e) => a.setReason(e.target.value as typeof a.reason)} data-testid="ly-adj-reason">
                  {ADJUST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`adj.reasons.${r}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className={styles.label}>{t('adj.note')}</div>
                <input className={styles.input} value={a.note} onChange={(e) => a.setNote(e.target.value)} placeholder={t('adj.notePh')} data-testid="ly-adj-note" />
                </div>
              </div>
              <div className={styles.res}>
                <div className={styles.resH}>{t('adj.result')}</div>
                <div className={styles.resRow}>
                  <span className={styles.grow}>{t('adj.curPoints')}</span>
                  <b>{fmt.number(a.current)}</b>
                </div>
                <div className={styles.resRow}>
                  <span className={styles.grow}>{t('adj.tierAfter')}</span>
                  <b data-testid="ly-adj-tier-after">{t(`tier.${a.tierAfter}`)}</b>
                </div>
                <div className={styles.resTot}>
                  <span className={styles.grow}>{t('adj.after')}</span>
                  <b data-testid="ly-adj-balance">{fmt.number(a.balance)}</b>
                </div>
              </div>
              <div className={styles.muted}>{t('adj.log')}</div>
            </div>
          ) : null}
        </div>
        <div className={styles.foot}>
          <span className={styles.muted}>{hint}</span>
          <span className={styles.grow} />
          <button type="button" className={styles.ghost} onClick={a.close}>
            {t('adj.cancel')}
          </button>
          <button type="button" className={styles.primary} disabled={!a.found || a.pending} onClick={() => void a.save()} data-testid="ly-adj-save">
            {isNew ? t('adj.saveNew') : t('adj.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
