// Trang ký công khai phụ lục `/sign/appendix/[token]` (TIP-030b F3 spec 15, 18 — prototype không có màn: dùng lại khung trang ký hợp đồng +
// SignForm + SignaturePad). Hiện mã phụ lục + hợp đồng cha + version + nội dung điều chỉnh → khối ký | đã ký: chứng nhận (SHA-256, lưu vết) |
// từ chối | link hết hiệu lực (token cũ / version cũ / hết hạn). Không đăng nhập.
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useSignStyles } from '../styles/sign.styles';
import { useAppendixStyles } from '../styles/appendix.styles';
import { SignForm } from '../components/SignForm';
import { appendixSignApi, appendixSignQuery } from '../hooks/useAppendixSign';
import type { AppendixSignView } from '../types';

/** OTP khách của mock (shared/api/mock/domains/contracts-appendix.ts). */
const MOCK_OTP = '864200';

function Doc({ v }: { v: AppendixSignView }) {
  const t = useTranslations('contracts.appendix.sign');
  const fmt = useFmt();
  const { styles, cx } = useSignStyles();
  const { styles: ax } = useAppendixStyles();
  const delta = v.value_delta === null ? null : `${v.value_delta.startsWith('-') ? '−' : '+'}${fmt.money(v.value_delta.replace('-', ''))}`;
  return (
    <div className={styles.card}>
      <div className={styles.h1}>{`${v.code} · ${v.title}`}</div>
      <div className={styles.muted}>{t('parent', { code: v.contract.code, title: v.contract.title })}</div>
      {v.expires_at ? <div className={styles.muted}>{t('expires', { at: fmt.date(v.expires_at) })}</div> : null}
      <div className={styles.kv}>
        <span>{t('version')}</span>
        <b>{v.version}</b>
      </div>
      {delta ? (
        <div className={styles.kv}>
          <span>{t('delta')}</span>
          <b>{delta}</b>
        </div>
      ) : null}
      <div className={styles.kv}>
        <span>{t('business')}</span>
        <b>{v.business.name}</b>
      </div>
      <div className={styles.ok}>
        <Icon name="ic-check" size={13} color={color.brandInk} strokeWidth={2.2} />
        {t('bizSigned')}
      </div>
      {v.content ? (
        <div className={cx(styles.clauses, ax.pre)} data-testid="apx-sign-content">
          {v.content}
        </div>
      ) : null}
    </div>
  );
}

function State({ icon, tone, bg, title, sub, testId }: { icon: 'ic-check' | 'ic-x' | 'ic-clock'; tone: string; bg: string; title: string; sub: string; testId: string }) {
  const { styles } = useSignStyles();
  return (
    <div className={styles.card} data-testid={testId}>
      <div className={styles.state}>
        <span className={styles.stateIc} style={{ background: bg }}>
          <Icon name={icon} size={26} color={tone} strokeWidth={2.2} />
        </span>
        <div className={styles.h1}>{title}</div>
        <div className={styles.muted}>{sub}</div>
      </div>
    </div>
  );
}

export function AppendixSignScreen({ token }: { token: string }) {
  const t = useTranslations('contracts.appendix.sign');
  const fmt = useFmt();
  const { styles } = useSignStyles();
  const q = useQuery(appendixSignQuery(token));
  const qc = useQueryClient();
  const [after, setAfter] = useState<AppendixSignView | null>(null);
  const done = (v: AppendixSignView) => {
    setAfter(v);
    void qc.invalidateQueries({ queryKey: ['contracts'] });
  };
  const v = after ?? q.data;
  const invalid = q.isError || (v && !['pending_signature', 'signed', 'declined'].includes(v.status));
  return (
    <div className={styles.page} data-testid="apx-sign-page">
      <div className={styles.wrap}>
        <div className={styles.brand}>
          <Icon name="ic-shield" size={16} color={color.brandInk} />
          {t('brand')}
        </div>
        {q.isLoading ? null : invalid ? (
          <State icon="ic-clock" tone={color.amberText} bg={color.warnSoftBg} title={t('invalidTitle')} sub={t('invalidSub')} testId="apx-sign-invalid" />
        ) : v?.status === 'signed' ? (
          <div className={styles.card} data-testid="apx-sign-cert">
            <div className={styles.h1}>{t('doneTitle', { code: v.code })}</div>
            <div className={styles.kv}>
              <span>{t('signedAt')}</span>
              <b>{v.signed_at ? `${fmt.date(v.signed_at)} ${fmt.time(v.signed_at)}` : ''}</b>
            </div>
            <div className={styles.hash} data-testid="apx-sign-sha">
              {v.sha256}
            </div>
          </div>
        ) : v?.status === 'declined' ? (
          <State icon="ic-x" tone={color.dangerDeep} bg={color.roseBg} title={t('declinedTitle')} sub={t('declinedSub')} testId="apx-sign-declined" />
        ) : v ? (
          <>
            <Doc v={v} />
            <SignForm<AppendixSignView> token={token} view={v} onDone={(x) => done(x.status === 'expired' ? { ...v, status: 'expired' } : x)} api={appendixSignApi} devOtp={MOCK_OTP} />
          </>
        ) : null}
      </div>
    </div>
  );
}
