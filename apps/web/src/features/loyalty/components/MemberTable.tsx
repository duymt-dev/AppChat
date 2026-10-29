// Bảng "Danh sách thành viên" — prototype L4437–4444 (lyMembers L11689): tìm · lọc hạng · 9 cột · phân trang. Bấm dòng mở drawer thành viên;
// menu dòng: Xem chi tiết · Điều chỉnh điểm (quyền loyalty.adjust). < md: dòng gọn (tên + hạng / điểm).
'use client';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import { useTableStyles } from '../styles/tables.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { STATUS_TONE, TIERS, TIER_TONE, avColor, initial, pts } from '../status';
import type { Member, TierKey } from '../types';

const COLS = ['points', 'earned', 'used', 'spent'] as const;

function Row({ m, i }: { m: Member; i: number }) {
  const t = useTranslations('loyalty');
  const { styles, cx } = useTableStyles();
  const ui = useLoyaltyUi();
  const canAdjust = useCan('loyalty.adjust');
  const tone = TIER_TONE[m.tier] ?? color.slateAvatar;
  const st = STATUS_TONE[m.status] ?? color.text3;
  const items = [
    { key: 'view', label: t('mem.menu.view'), icon: 'ic-eye' as const, onClick: () => ui.set({ menuFor: null, detail: m.contact_id, tab: 'overview' }) },
    ...(canAdjust
      ? [{ key: 'adjust', label: t('mem.menu.adjust'), icon: 'ic-gift' as const, onClick: () => ui.set({ menuFor: null, adjust: true, adjustFor: m.phone }) }]
      : []),
  ];
  return (
    <div className={styles.mRow} onClick={() => ui.set({ detail: m.contact_id, tab: 'overview' })} data-member={m.contact_id}>
      <span className={cx(styles.idx, styles.hideM)}>{i + 1}</span>
      <div className={styles.who}>
        <span className={styles.av} style={{ background: avColor(m.name) }}>
          {initial(m.name)}
        </span>
        <div className={styles.min0}>
          <div className={styles.name}>{m.name}</div>
          <div className={styles.phone}>{m.phone}</div>
        </div>
      </div>
      <span>
        <span className={styles.tier} style={{ background: `${tone}18`, color: tone }} data-testid="ly-tier">
          {t(`tier.${m.tier}`)}
        </span>
      </span>
      <span className={cx(styles.pts, styles.hideM)} data-testid="ly-points">
        {pts(m.points)}
      </span>
      <span className={cx(styles.num, styles.hideM)}>{pts(m.earned)}</span>
      <span className={cx(styles.numMuted, styles.hideM)}>{pts(m.used)}</span>
      <span className={cx(styles.money, styles.hideM)}>{t('mem.vnd', { v: Number(m.spent).toLocaleString('vi-VN') })}</span>
      <span className={styles.hideM}>
        <span className={styles.st} style={{ background: `${st}18`, color: st }}>
          {t(`mem.status.${m.status}`)}
        </span>
      </span>
      <div className={cx(styles.menu, styles.hideM)} onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          open={ui.menuFor === m.contact_id}
          onToggle={() => ui.set({ menuFor: ui.menuFor === m.contact_id ? null : m.contact_id })}
          onClose={() => ui.set({ menuFor: null })}
          label={t('mem.menu.open')}
          variant="ghost"
          items={items}
        />
      </div>
    </div>
  );
}

export function MemberTable({ rows }: { rows: Member[] }) {
  const t = useTranslations('loyalty.mem');
  const tt = useTranslations('loyalty.tier');
  const { styles, cx } = useLoyaltyStyles();
  const tb = useTableStyles().styles;
  const ui = useLoyaltyUi();
  return (
    <div className={styles.card} data-testid="ly-members">
      <div className={styles.cardH}>
        <div className={styles.cardT}>{t('title')}</div>
        <span className={styles.grow} />
        <div className={styles.miniSearch}>
          <Icon name="ic-search" size={13} color={color.text4} strokeWidth={1.9} />
          <input value={ui.filter.q} onChange={(e) => ui.setFilter({ q: e.target.value })} placeholder={t('find')} aria-label={t('find')} />
        </div>
        <select
          className={styles.select}
          value={ui.filter.tier}
          onChange={(e) => ui.setFilter({ tier: e.target.value as TierKey | 'all' })}
          aria-label={t('allTiers')}
          data-testid="ly-f-tier"
        >
          <option value="all">{t('allTiers')}</option>
          {TIERS.map((k) => (
            <option key={k} value={k}>
              {tt(k)}
            </option>
          ))}
        </select>
      </div>
      <div className={tb.scroll}>
        <div className={tb.mHead}>
          <span>{t('col.idx')}</span>
          <span>{t('col.name')}</span>
          <span>{t('col.tier')}</span>
          {COLS.map((k) => (
            <span key={k} className={tb.end}>
              {t(`col.${k}`)}
            </span>
          ))}
          <span>{t('col.status')}</span>
          <span className={tb.end}>{t('col.act')}</span>
        </div>
        {rows.map((m, i) => (
          <Row key={m.contact_id} m={m} i={i} />
        ))}
        {rows.length ? null : <div className={styles.foot}>{t('empty')}</div>}
      </div>
      <div className={styles.foot}>
        <span>{t.rich('foot', { n: rows.length, b: (c) => <b>{c}</b> })}</span>
        <span className={styles.grow} />
        <span className={styles.page}>{t('prev')}</span>
        <span className={cx(styles.page, styles.pageOn)}>1</span>
        <span className={styles.page}>{t('next')}</span>
      </div>
    </div>
  );
}
