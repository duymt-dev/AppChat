// Trang ký công khai `/sign/[token]` (COMMERCE §9 C1; Blueprint §4.4 public, §7.2 (public)/sign) — không cần đăng nhập.
// Hiển thị: các bên + nội dung → khối ký (SignForm) | đã ký: trang chứng nhận (mã HĐ, SHA-256, thời điểm, lưu vết IP) | từ chối | link hết hiệu lực.
'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useSignStyles } from '../styles/sign.styles';
import { signViewQuery } from '../api';
import { useSignVisit } from '../hooks/useSigningAttempt';
import { SignForm } from '../components/SignForm';
import type { SignView } from '../types';

function StateCard({
  icon,
  tone,
  bg,
  title,
  sub,
}: {
  icon: 'ic-check' | 'ic-x' | 'ic-clock';
  tone: string;
  bg: string;
  title: string;
  sub: string;
}) {
  const { styles } = useSignStyles();
  return (
    <div className={styles.state}>
      <span className={styles.stateIc} style={{ background: bg }}>
        <Icon name={icon} size={26} color={tone} strokeWidth={2.2} />
      </span>
      <div className={styles.h1}>{title}</div>
      <div className={styles.muted}>{sub}</div>
    </div>
  );
}

function Certificate({ v }: { v: SignView }) {
  const t = useTranslations('contracts.sign');
  const fmt = useFmt();
  const { styles } = useSignStyles();
  const at = (iso: string) => `${fmt.date(iso)} ${fmt.time(iso)}`;
  return (
    <div className={styles.card} data-testid="sign-cert">
      <StateCard
        icon="ic-check"
        tone={color.brandInk}
        bg={color.brandBg}
        title={t('doneTitle')}
        sub={t('doneSub')}
      />
      <div className={styles.h}>{t('cert')}</div>
      <div className={styles.kv}>
        <span>{t('certCode')}</span>
        <b>{v.code}</b>
      </div>
      <div className={styles.kv}>
        <span>{t('certAt')}</span>
        <b>{v.signed_at ? at(v.signed_at) : ''}</b>
      </div>
      <div className={styles.h}>{t('certHash')}</div>
      <div className={styles.hash} data-testid="sign-sha">
        {v.sha256}
      </div>
      <div className={styles.h}>{t('certTrail')}</div>
      <div className={styles.trail}>
        {v.certificate.map((e, i) => (
          <div key={`${e.type}-${i}`}>
            {t(`ev.${e.type}` as never)}
            <span>{t('evMeta', { at: at(e.at), ip: e.ip ?? '—' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Doc({ v }: { v: SignView }) {
  const t = useTranslations('contracts');
  const fmt = useFmt();
  const { styles, cx } = useSignStyles();
  const value = fmt.money(v.value);
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h1}>{`${v.code} · ${v.title}`}</div>
        {v.expires_at ? (
          <div className={styles.muted}>{t('sign.expires', { at: fmt.date(v.expires_at) })}</div>
        ) : null}
      </div>
      <div className={styles.card}>
        <div className={styles.parties}>
          <div className={styles.party}>
            <div className={styles.pl}>{t('sign.bizParty')}</div>
            <div className={styles.pv}>{v.business.name}</div>
            <div className={styles.ok}>
              <Icon name="ic-check" size={13} color={color.brandInk} strokeWidth={2.2} />
              {t('sign.bizSigned')}
            </div>
          </div>
          <div className={styles.party}>
            <div className={styles.pl}>{t('sign.custParty')}</div>
            <div className={styles.pv}>{v.customer.name}</div>
            <div className={cx(styles.ok, styles.wait)}>
              <Icon name="ic-clock" size={13} color={color.amberText} />
              {t('sign.custWaiting')}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.h}>{t('sign.doc')}</div>
        <div className={styles.kv}>
          <span>{t('sign.kind')}</span>
          <b>{t(`kind.${v.kind}`)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('sign.value')}</span>
          <b>{value}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('sign.eff')}</span>
          <b>
            {v.start_date && v.end_date
              ? t('eff', { from: fmt.date(v.start_date), to: fmt.date(v.end_date) })
              : t('dash')}
          </b>
        </div>
        <ol className={styles.clauses}>
          <li>{t('sign.clause1', { title: v.title })}</li>
          <li>{t('sign.clause2', { value })}</li>
          <li>{t('sign.clause3')}</li>
        </ol>
      </div>
    </>
  );
}

export function SignScreen({ token }: { token: string }) {
  const t = useTranslations('contracts.sign');
  const { styles } = useSignStyles();
  const q = useQuery(signViewQuery(token));
  const qc = useQueryClient();
  const [after, setAfter] = useState<SignView | null>(null);
  // Khách ký / từ chối: đánh dấu cache hợp đồng cũ (cùng trình duyệt — xem lại màn nội bộ thì tải lại; backend thật phát contract.signed qua WS).
  const done = (v: SignView) => {
    setAfter(v);
    void qc.invalidateQueries({ queryKey: ['contracts'] });
  };
  // Lượt mở chủ định (POST open một lần mỗi token) — mọi nhánh hiển thị, tách khỏi GET; kết quả cập nhật cache xem.
  useSignVisit(token, q.isSuccess, (view) => qc.setQueryData(signViewQuery(token).queryKey, view));
  const v = after ?? q.data;
  const invalid =
    q.isError ||
    (v &&
      (v.status === 'expired' ||
        v.status === 'terminated' ||
        v.status === 'draft' ||
        v.status === 'pending_approval'));
  return (
    <div className={styles.page} data-testid="sign-page">
      <div className={styles.wrap}>
        <div className={styles.brand}>
          <Icon name="ic-shield" size={16} color={color.brandInk} />
          {t('brand')}
        </div>
        {q.isLoading ? null : invalid ? (
          <div className={styles.card} data-testid="sign-invalid">
            <StateCard
              icon="ic-clock"
              tone={color.amberText}
              bg={color.warnSoftBg}
              title={t('invalidTitle')}
              sub={t('invalidSub')}
            />
          </div>
        ) : v?.status === 'signed' ? (
          <Certificate v={v} />
        ) : v?.status === 'declined' ? (
          <div className={styles.card} data-testid="sign-declined">
            <StateCard
              icon="ic-x"
              tone={color.dangerDeep}
              bg={color.roseBg}
              title={t('declinedTitle')}
              sub={t('declinedSub')}
            />
          </div>
        ) : v ? (
          <>
            <Doc v={v} />
            <SignForm token={token} view={v} onDone={done} />
          </>
        ) : null}
      </div>
    </div>
  );
}
