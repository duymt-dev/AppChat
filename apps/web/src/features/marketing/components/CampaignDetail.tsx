// Trang chi tiết chiến dịch (toàn màn) — prototype L3797–3866. Đầu: ← · kênh · tên · phân khúc · trạng thái · Xuất danh sách (CSV thật,
// đúng scope) · Gửi lại người chưa phản hồi (tạo NHÁP mới — vẫn qua duyệt + khoá 48 giờ, không gửi ngay). Nút hiện theo `allowed[]` server.
// Chờ duyệt: Duyệt & gửi (luôn xác nhận — campaign.approve) · Từ chối (nhập lý do) · Gửi thử (tới email của chính người bấm).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import { useDetailStyles } from '../styles/detail.styles';
import { useMarketingUi, type DetailTab } from '../marketing-store';
import { campaignQuery } from '../api';
import { CHANNEL_LOOK } from '../status';
import { StatusText } from '../columns';
import type { CampaignDetail as Detail } from '../types';
import { ContentTab, HistoryTab, RecipientsTab } from './DetailTabs';
import { useFmt } from '@/shared/i18n/useFmt';

const TABS: DetailTab[] = ['recipients', 'content', 'history'];
const BACK = '←';
/** Nút theo `allowed[]` của server (trạng thái + quyền người xem). */
const A = { approve: 'campaign.approve', reject: 'campaign.reject', submit: 'campaign.submit', test: 'campaign.send_test', exp: 'campaign.recipient_export', resend: 'campaign.resend_unread' } as const;

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

function ApprovalBar({ c }: { c: Detail }) {
  const t = useTranslations('marketing');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles } = useDetailStyles();
  const [reason, setReason] = useState('');
  const approve = useAction('campaign.approve');
  const reject = useAction('campaign.reject');
  const submit = useAction('campaign.submit');
  const test = useAction<{ sent_to: string }>('campaign.send_test');
  const id = { campaign_id: c.id, if_version: c.version };
  const can = (id: (typeof A)[keyof typeof A]) => c.allowed.includes(id);
  const sendTest = async () => {
    const r = await test.run({ campaign_id: c.id }, { silent: true });
    if (r) void message.success(t('detail.testDone', { to: r.result.sent_to }));
  };
  const testBtn = can(A.test) ? (
    <button type="button" className={styles.ghost} disabled={test.isPending} onClick={() => void sendTest()} data-testid="mk-send-test">
      {t('detail.sendTest')}
    </button>
  ) : null;
  if (c.status === 'pending_approval')
    return (
      <div className={styles.bar} data-testid="mk-approval">
        <Icon name="ic-clock" size={16} color={color.noticeText} />
        {t('detail.approvalBar', { n: fmt.number(c.stats.eligible || c.est_recipients) })}
        <span className={styles.grow} />
        {testBtn}
        {can(A.reject) ? (
          <>
            <input className={styles.reason} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('detail.reasonPh')} aria-label={t('detail.reasonPh')} data-testid="mk-reject-reason" />
            <button type="button" className={styles.danger} disabled={!reason.trim()} onClick={() => void reject.run({ ...id, reason: reason.trim() })} data-testid="mk-reject">
              {t('detail.reject')}
            </button>
          </>
        ) : null}
        {can(A.approve) ? (
          <button type="button" className={styles.primary} onClick={() => void approve.run(id)} data-testid="mk-approve">
            <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
            {t('detail.approve')}
          </button>
        ) : null}
      </div>
    );
  if (can(A.submit))
    return (
      <div className={styles.bar}>
        {c.status === 'rejected' ? t('detail.rejected', { reason: c.reject_reason ?? '' }) : t('status.draft')}
        <span className={styles.grow} />
        {testBtn}
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
  const exp = useAction<{ file_id: string; rows: number; url: string }>('campaign.recipient_export');
  const resend = useAction<{ campaign_id: string; code: string; est_recipients: number; read_evidence: boolean }>('campaign.resend_unread');
  const [tone, g] = CHANNEL_LOOK[c.channel];
  const doExport = async () => {
    const r = await exp.run({ campaign_id: c.id }, { silent: true });
    if (r) saveBlob(await transport.blob(r.result.url.replace(/^\/v1/, '')), `${c.code}-nguoi-nhan.csv`);
  };
  const doResend = async () => {
    const r = await resend.run({ campaign_id: c.id }, { silent: true });
    if (!r) return;
    void message.success(t(r.result.read_evidence ? 'detail.resendDone' : 'detail.resendNoRead', { code: r.result.code, n: r.result.est_recipients }));
    set({ detail: r.result.campaign_id, tab: 'content' });
  };
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
          <div className={styles.sub}>{`${t(`chanLabel.${c.channel}`)} · ${c.segment || t('detail.noSegment')}`}</div>
        </div>
        <StatusText c={c} />
        <span className={styles.grow} />
        {c.allowed.includes(A.exp) ? (
          <button type="button" className={styles.ghost} disabled={exp.isPending} onClick={() => void doExport()} data-testid="mk-export">
            <Icon name="ic-download" size={14} color={color.text3} />
            {t('detail.export')}
          </button>
        ) : null}
        {c.allowed.includes(A.resend) && c.stats.sent ? (
          <button type="button" className={styles.primary} disabled={resend.isPending} onClick={() => void doResend()} data-testid="mk-resend">
            <Icon name="ic-mega" size={14} color={color.white} strokeWidth={1.9} />
            {t('detail.resend')}
          </button>
        ) : null}
      </div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={cx(styles.tab, tab === k && styles.tabOn)} onClick={() => set({ tab: k })} data-testid={`mk-dtab-${k}`}>
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
