// Cột DataTable chiến dịch — prototype L3485–3515 + thẻ mobile. Menu dòng theo trạng thái (Blueprint §2.2 campaign):
// Xem chi tiết · Gửi duyệt (nháp / bị từ chối) · Duyệt & gửi / Từ chối (chờ duyệt, quyền campaign.approve) · Tạm dừng · Tiếp tục · Huỷ · Xoá.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type ActionMenuItem, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useMkCellStyles } from './styles/cells.styles';
import { useMarketingUi } from './marketing-store';
import { CHANNEL_LOOK, STATUS_TONE } from './status';
import type { Campaign } from './types';

const SPARK = '✦';
const HINTS = 6;
const num = (n: number) => n.toLocaleString('vi-VN');
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function StatusText({ c }: { c: Campaign }) {
  const t = useTranslations('marketing.status');
  const { styles } = useMkCellStyles();
  const tone = STATUS_TONE[c.status];
  return (
    <span className={styles.st} style={{ color: tone }} data-testid="mk-row-status">
      <span className={styles.stDot} style={{ background: tone }} />
      {t(c.status)}
    </span>
  );
}

export function ChannelCell({ c }: { c: Campaign }) {
  const t = useTranslations('marketing.chanLabel');
  const { styles } = useMkCellStyles();
  const [tone, g] = CHANNEL_LOOK[c.channel];
  return (
    <div className={styles.ch}>
      <span className={styles.chIc} style={{ background: tone }}>
        {g}
      </span>
      <span className={styles.chL}>{t(c.channel)}</span>
    </div>
  );
}

function Perf({ c }: { c: Campaign }) {
  const t = useTranslations('marketing.perf');
  const { styles } = useMkCellStyles();
  const { sent, open, click, progress } = c.stats;
  const op = pct(open, sent);
  const cl = pct(click, open);
  const cells: [string, string, number, string][] = [
    ['sent', sent ? num(sent) : t('none'), sent ? Math.min(100, progress) : 0, CHANNEL_LOOK[c.channel][0]],
    ['open', sent ? `${op}%` : t('dash'), op, color.mkOpen],
    ['click', sent ? `${cl}%` : t('dash'), cl, color.mkClick],
  ];
  return (
    <div className={styles.perf}>
      {cells.map(([k, v, w, tone]) => (
        <div key={k} className={styles.min0}>
          <div className={styles.pL}>{t(k)}</div>
          <div className={styles.pV}>{v}</div>
          <div className={styles.bar}>
            <div style={{ width: `${w}%`, background: tone }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AiCell({ c, idx }: { c: Campaign; idx: number }) {
  const t = useTranslations('marketing');
  const { message } = App.useApp();
  const { styles } = useMkCellStyles();
  const hint = t(`hint.${idx % HINTS}`);
  const wait = idx % 3 === 2;
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiT} title={hint}>{`${SPARK} ${hint}`}</span>
      {wait ? (
        <button
          type="button"
          className={styles.round}
          style={{ background: color.brand }}
          title={t('aiDo')}
          aria-label={t('aiDo')}
          onClick={() => void message.info(t('aiDoing'))}
        >
          <Icon name="ic-bolt" size={12} color={color.white} strokeWidth={2.2} />
        </button>
      ) : null}
      <button
        type="button"
        className={styles.round}
        style={{ background: color.aiPeekBg }}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => void message.info(`${c.code} · ${hint}`)}
      >
        <Icon name="ic-spark" size={12} color={color.violet} strokeWidth={1.9} />
      </button>
    </div>
  );
}

function RowMenu({ c }: { c: Campaign }) {
  const t = useTranslations('marketing');
  const ui = useMarketingUi();
  const canManage = useCan('campaign.manage');
  const canApprove = useCan('campaign.approve');
  const submit = useAction('campaign.submit');
  const approve = useAction('campaign.approve');
  const reject = useAction('campaign.reject');
  const pause = useAction('campaign.pause');
  const resume = useAction('campaign.resume');
  const cancel = useAction('campaign.cancel');
  const del = useAction('campaign.delete');
  const id = { campaign_id: c.id };
  const go = (fn: () => unknown) => () => (ui.set({ menuFor: null }), void fn());
  const s = c.status;
  const item = (key: string, icon: ActionMenuItem['icon'], iconColor: string, fn: () => unknown, extra: Partial<ActionMenuItem> = {}) => ({
    key,
    label: t(`menu.${key}`),
    icon,
    iconColor,
    onClick: go(fn),
    ...extra,
  });
  const items: ActionMenuItem[] = [
    item('view', 'ic-eye', color.sky, () => ui.set({ detail: c.id, tab: 'recipients' })),
    ...(canManage && (s === 'draft' || s === 'rejected') ? [item('submit', 'ic-send', color.info, () => submit.run(id))] : []),
    ...(canApprove && s === 'pending_approval'
      ? [
          item('approve', 'ic-check', color.okStrong, () => approve.run(id), { divider: true }),
          item('reject', 'ic-x', color.amberText, () => reject.run({ ...id, reason: t('rejectReason') })),
        ]
      : []),
    ...(canManage && (s === 'running' || s === 'scheduled') ? [item('pause', 'ic-clock', color.amberGold, () => pause.run(id))] : []),
    ...(canManage && s === 'paused' ? [item('resume', 'ic-play', color.okStrong, () => resume.run(id))] : []),
    ...(canManage && ['draft', 'pending_approval', 'scheduled', 'running', 'paused'].includes(s)
      ? [item('cancel', 'ic-x', color.text3, () => cancel.run(id), { divider: true })]
      : []),
    ...(canManage && ['draft', 'rejected', 'cancelled'].includes(s)
      ? [item('delete', 'ic-trash', color.dangerStrong, () => del.run(id), { danger: true })]
      : []),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === c.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === c.id ? null : c.id })}
        onClose={() => ui.set({ menuFor: null })}
        label={t('menu.open')}
        variant="ghost"
        items={items}
        testId={`mk-menu-${c.id}`}
      />
    </div>
  );
}

export function useCampaignColumns(rows: Campaign[]): TableColumnsType<Campaign> {
  const t = useTranslations('marketing');
  const { styles } = useMkCellStyles();
  const idx = (c: Campaign) => rows.indexOf(c);
  return [
    {
      key: 'name',
      title: t('col.name'),
      width: 300,
      render: (_, c) => {
        const tone = CHANNEL_LOOK[c.channel][0];
        const ai = c.source === 'ai';
        return (
          <div className={styles.camp}>
            <span className={styles.tile} style={{ background: `${tone}18` }}>
              <Icon name="ic-mega" size={18} color={tone} />
            </span>
            <div className={styles.min0}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{c.name}</span>
                <span
                  className={styles.type}
                  style={{ background: ai ? color.mkAiTag : color.muteBg, color: ai ? color.violet : color.text3 }}
                >
                  {t(ai ? 'badge.ai' : 'badge.manual')}
                </span>
              </div>
              <div className={styles.desc}>{c.desc}</div>
            </div>
          </div>
        );
      },
    },
    { key: 'ch', title: t('col.channel'), width: 130, render: (_, c) => <ChannelCell c={c} /> },
    { key: 'st', title: t('col.status'), width: 120, render: (_, c) => <StatusText c={c} /> },
    {
      key: 'time',
      title: t('col.time'),
      width: 150,
      render: (_, c) => (
        <div className={styles.time}>
          <div>{t('timeLine', { date: c.date })}</div>
          <div className={styles.timeEnd}>{t('endLine', { end: c.end })}</div>
        </div>
      ),
    },
    { key: 'perf', title: t('col.perf'), width: 260, render: (_, c) => <Perf c={c} /> },
    { key: 'ai', title: t('col.ai'), width: 132, render: (_, c) => <AiCell c={c} idx={idx(c)} /> },
    {
      key: 'act',
      title: <span className={styles.end}>{t('col.act')}</span>,
      width: 52,
      render: (_, c) => (
        <div className={styles.menu}>
          <RowMenu c={c} />
        </div>
      ),
    },
  ];
}

export function CampaignCard({ c }: { c: Campaign }) {
  const { styles } = useMkCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.name}>{c.name}</span>
        <StatusText c={c} />
      </div>
      <div className={styles.mRow}>
        <ChannelCell c={c} />
        <span className={styles.mSub}>{c.date}</span>
      </div>
      <div className={styles.desc}>{c.desc}</div>
    </>
  );
}
