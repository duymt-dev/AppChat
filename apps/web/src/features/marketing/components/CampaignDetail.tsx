// Trang chi tiết chiến dịch (toàn màn) — prototype L3797–3866. Đầu: ← · kênh · tên · phân khúc · trạng thái · Xuất danh sách · Gửi lại người chưa đọc.
// Chiến dịch Chờ duyệt: thanh duyệt (Duyệt & gửi — luôn xác nhận qua campaign.approve · Từ chối · Gửi thử). Nháp / bị từ chối: Gửi duyệt.
'use client';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useDetailStyles } from '../styles/detail.styles';
import { useMarketingUi, type DetailTab } from '../marketing-store';
import { campaignQuery } from '../api';
import { CHANNEL_LOOK } from '../status';
import { StatusText } from '../columns';
import type { CampaignDetail as Detail } from '../types';
import { ContentTab, HistoryTab, RecipientsTab } from './DetailTabs';

const TABS: DetailTab[] = ['recipients', 'content', 'history'];
const BACK = '←';

function ApprovalBar({ c }: { c: Detail }) {
  const t = useTranslations('marketing');
  const { message } = App.useApp();
  const { styles } = useDetailStyles();
  const canApprove = useCan('campaign.approve');
  const canManage = useCan('campaign.manage');
  const approve = useAction('campaign.approve');
  const reject = useAction('campaign.reject');
  const submit = useAction('campaign.submit');
  const test = useAction<{ sent_to: string }>('campaign.send_test');
  const id = { campaign_id: c.id };
  const sendTest = async () => {
    const r = await test.run(id, { silent: true });
    if (r) void message.success(t('detail.testDone', { to: r.result.sent_to }));
  };
  if (c.status === 'pending_approval')
    return (
      <div className={styles.bar} data-testid="mk-approval">
        <Icon name="ic-clock" size={16} color={color.noticeText} />
        {t('detail.approvalBar', { n: c.est_recipients.toLocaleString('vi-VN') })}
        <span className={styles.grow} />
        {canManage ? (
          <button type="button" className={styles.ghost} onClick={() => void sendTest()} data-testid="mk-send-test">
            {t('detail.sendTest')}
          </button>
        ) : null}
        {canApprove ? (
          <>
            <button type="button" className={styles.danger} onClick={() => void reject.run({ ...id, reason: t('rejectReason') })} data-testid="mk-reject">
              {t('detail.reject')}
            </button>
            <button type="button" className={styles.primary} onClick={() => void approve.run(id)} data-testid="mk-approve">
              <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
              {t('detail.approve')}
            </button>
          </>
        ) : null}
      </div>
    );
  if ((c.status === 'draft' || c.status === 'rejected') && canManage)
    return (
      <div className={styles.bar}>
        {c.status === 'rejected' ? t('detail.rejected', { reason: c.reject_reason ?? '' }) : t('status.draft')}
        <span className={styles.grow} />
        <button type="button" className={styles.primary} onClick={() => void submit.run(id)} data-testid="mk-submit">
          <Icon name="ic-send" size={14} color={color.white} strokeWidth={2} />
          {t('detail.submit')}
        </button>
      </div>
    );
  return null;
}

export function CampaignDetail() {
  const id = useMarketingUi((s) => s.detail);
  const c = useQuery({ ...campaignQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !c || c.id !== id) return null;
  return <DetailPage c={c} />;
}

function DetailPage({ c }: { c: Detail }) {
  const t = useTranslations('marketing');
  const { message } = App.useApp();
  const { styles, cx } = useDetailStyles();
  const tab = useMarketingUi((s) => s.tab);
  const set = useMarketingUi((s) => s.set);
  const [tone, g] = CHANNEL_LOOK[c.channel];
  return (
    <div className={styles.page} role="dialog" aria-modal="true" data-testid="mk-detail">
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={() => set({ detail: null })} aria-label={t('detail.back')} data-testid="mk-detail-back">
          {BACK}
        </button>
        <span className={styles.chIc} style={{ background: tone }}>
          {g}
        </span>
        <div className={styles.min0}>
          <div className={styles.name}>{c.name}</div>
          <div className={styles.sub}>{`${t(`chanLabel.${c.channel}`)} · ${c.segment}`}</div>
        </div>
        <StatusText c={c} />
        <span className={styles.grow} />
        <button type="button" className={styles.ghost} onClick={() => void message.info(t('detail.exporting'))}>
          <Icon name="ic-download" size={14} color={color.text3} />
          {t('detail.export')}
        </button>
        {c.stats.sent ? (
          <button type="button" className={styles.primary} onClick={() => void message.success(t('detail.resendDone'))}>
            <Icon name="ic-mega" size={14} color={color.white} strokeWidth={1.9} />
            {t('detail.resend')}
          </button>
        ) : null}
      </div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={cx(styles.tab, tab === k && styles.tabOn)}
            onClick={() => set({ tab: k })}
            data-testid={`mk-dtab-${k}`}
          >
            {t(`detail.tab.${k}`)}
          </button>
        ))}
      </div>
      <div className={styles.body}>
        <ApprovalBar c={c} />
        {tab === 'recipients' ? <RecipientsTab c={c} /> : null}
        {tab === 'content' ? <ContentTab c={c} /> : null}
        {tab === 'history' ? <HistoryTab c={c} /> : null}
      </div>
    </div>
  );
}
