// Cột DataTable chiến dịch — prototype L3485–3515 + thẻ mobile. Hiệu suất theo bằng chứng (DC-240): Đã gửi (kênh nhận) · Phản hồi ·
// Chuyển đổi — kênh không xác nhận đọc / click thì không có cột "mở / click" giả. Ô AI mở Trợ lý · Marketing với chiến dịch đang chọn
// làm ngữ cảnh (lượt thật, không toast giả). Menu dòng ở components/RowMenu.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type TableColumnsType } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useMkCellStyles } from './styles/cells.styles';
import { useMarketingUi } from './marketing-store';
import { CHANNEL_LOOK, STATUS_TONE } from './status';
import { RowMenu } from './components/RowMenu';
import type { Campaign } from './types';

const SPARK = '✦';
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
  const fmt = useFmt();
  const { styles } = useMkCellStyles();
  const { sent, replied, converted, progress } = c.stats;
  const rp = pct(replied, sent);
  const cv = pct(converted, sent);
  const cells: [string, string, number, string][] = [
    ['sent', sent ? fmt.number(sent) : t('none'), sent ? Math.min(100, progress) : 0, CHANNEL_LOOK[c.channel][0]],
    ['reply', sent ? `${rp}%` : t('dash'), rp, color.mkOpen],
    ['converted', sent ? `${cv}%` : t('dash'), cv, color.mkClick],
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

/** Gợi ý theo trạng thái + số đo thật (không câu mẫu ngẫu nhiên); bấm ✦ mở Trợ lý với chiến dịch này. */
function AiCell({ c }: { c: Campaign }) {
  const t = useTranslations('marketing');
  const { styles } = useMkCellStyles();
  const set = useMarketingUi((s) => s.set);
  const s = c.stats;
  const hint =
    c.status === 'pending_approval' ? t('hint.review') : s.unknown ? t('hint.unknown', { n: s.unknown }) : s.sent && !s.replied ? t('hint.noReply') : s.sent ? t('hint.resend') : c.status === 'draft' ? t('hint.draft') : t('hint.wait');
  return (
    <div className={styles.ai} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiT} title={hint}>{`${SPARK} ${hint}`}</span>
      <button
        type="button"
        className={styles.round}
        style={{ background: color.aiPeekBg }}
        title={t('aiPeek')}
        aria-label={t('aiPeek')}
        onClick={() => set({ detail: null, focus: c.id, aiOpen: true })}
        data-testid={`mk-row-ai-${c.id}`}
      >
        <Icon name="ic-spark" size={12} color={color.violet} strokeWidth={1.9} />
      </button>
    </div>
  );
}

export function useCampaignColumns(): TableColumnsType<Campaign> {
  const t = useTranslations('marketing');
  const fmt = useFmt();
  const { styles } = useMkCellStyles();
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
                <span className={styles.type} style={{ background: ai ? color.mkAiTag : color.muteBg, color: ai ? color.violet : color.text3 }}>
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
          <div>{t('timeLine', { date: fmt.date(c.date), time: fmt.time(c.date) })}</div>
          <div className={styles.timeEnd}>{t('endLine', { end: c.end ? `${fmt.date(c.end)} · ${fmt.time(c.end)}` : t('noEnd') })}</div>
        </div>
      ),
    },
    { key: 'perf', title: t('col.perf'), width: 260, render: (_, c) => <Perf c={c} /> },
    { key: 'ai', title: t('col.ai'), width: 132, render: (_, c) => <AiCell c={c} /> },
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
  const fmt = useFmt();
  return (
    <>
      <div className={styles.mRow}>
        <span className={styles.name}>{c.name}</span>
        <StatusText c={c} />
      </div>
      <div className={styles.mRow}>
        <ChannelCell c={c} />
        <span className={styles.mSub}>{fmt.date(c.date)}</span>
      </div>
      <div className={styles.desc}>{c.desc}</div>
    </>
  );
}
