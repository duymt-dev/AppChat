// 5 tab drawer hợp đồng — prototype L5446–5484: Tổng quan · CRM · AI · Tệp · Lịch sử (timeline ký điện tử từ contract_signature_event).
// "Ký số" của prototype → "Ký điện tử" (COMMERCE §9, ngoại lệ parity có ghi tên).
'use client';
import Link from 'next/link';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useContractTabStyles } from '../styles/tabs.styles';
import { useContractsUi } from '../contracts-store';
import { useContractPdf } from '../hooks/useContractPdf';
import { useEff, useTr } from '../columns';
import type { Contract, ContractsMeta } from '../types';

const EXT_BG: Record<string, string> = {
  pdf: color.dangerStrong,
  docx: color.blue,
  xlsx: color.okGreen,
  jpg: color.violet,
  png: color.violet,
};
const EV_DOT: Record<string, string> = {
  signed: color.brand,
  approved_signed: color.brand,
  sent: color.blue,
  reminded: color.blue,
  link_extended: color.blue,
  declined: color.dangerDeep,
  terminated: color.dangerDeep,
  expired: color.dangerDeep,
  otp_fail: color.amberText,
};

/** Dòng "Ký điện tử" — trạng thái ký kèm ngày (prototype ctDetail.sign). */
export function useSignState() {
  const t = useTranslations('contracts.detail.signState');
  const fmt = useFmt();
  return (c: Contract) => {
    const at =
      c.signed_by_customer_at ?? c.sent_at ?? (c.status === 'expired' ? c.end_date : null) ?? c.created_at;
    return t(c.status, { at: fmt.date(at ?? c.signed_date) });
  };
}

export function OverviewTab({ c }: { c: Contract }) {
  const t = useTranslations('contracts.detail');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useContractTabStyles();
  const tr = useTr();
  const eff = useEff();
  const sign = useSignState();
  const set = useContractsUi((s) => s.set);
  const canSign = useCan('contract.sign');
  const pdf = useContractPdf();
  const path = c.sign_token ? `/sign/${c.sign_token}` : '';
  const link = c.sign_token
    ? `${typeof window === 'undefined' ? '' : window.location.origin}/sign/${c.sign_token}`
    : '';
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('info')}</div>
        <div className={styles.kv}>
          <span>{t('svc')}</span>
          <b>{c.title}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('value')}</span>
          <b className={styles.green}>{tr(c.value)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('eff')}</span>
          <b>{eff(c)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('sign')}</span>
          <b data-testid="ct-sign-state">{sign(c)}</b>
        </div>
        {c.signed_sha256 ? (
          <div className={styles.kv}>
            <span>{t('sha')}</span>
            <b className={styles.mono}>{`${c.signed_sha256.slice(0, 16)}…`}</b>
          </div>
        ) : null}
        {link && c.status === 'pending_signature' ? (
          <div className={styles.link} data-testid="ct-sign-link">
            {t('link')}
            <Link href={path} data-testid="ct-sign-href">
              {link}
            </Link>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(link).catch(() => undefined);
                void message.success(t('copied'));
              }}
            >
              {t('copy')}
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.btns}>
        <button
          type="button"
          className={styles.btn}
          disabled={!canSign || c.status !== 'pending_signature'}
          onClick={() => set({ sendFor: c.id })}
          data-testid="ct-send-sign"
        >
          <Icon name="ic-send" size={15} color="currentColor" />
          {t('sendSign')}
        </button>
        <button
          type="button"
          className={cx(styles.btn, styles.btnPrimary)}
          disabled={pdf.busy}
          onClick={() => void pdf.open(c.id)}
          data-testid="ct-pdf"
        >
          <Icon name="ic-dl" size={15} color={color.white} />
          {t('pdf')}
        </button>
      </div>
      {link && c.status === 'pending_signature' ? (
        <div className={styles.fMeta}>{t('linkExp', { at: fmt.date(c.sign_link_expires_at ?? '') })}</div>
      ) : null}
    </>
  );
}

export function CrmTab({ meta }: { meta: ContractsMeta }) {
  const t = useTranslations('contracts.detail');
  const { styles, cx } = useContractTabStyles();
  const tr = useTr();
  const fmt = useFmt();
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('crm')}</div>
        <div className={styles.grid}>
          <div>
            <div className={styles.gl}>{t('ltv')}</div>
            <div className={styles.gv}>{tr(meta.crm.ltv)}</div>
          </div>
          <div>
            <div className={styles.gl}>{t('total')}</div>
            <div className={styles.gv}>{meta.crm.total}</div>
          </div>
          <div>
            <div className={styles.gl}>{t('tier')}</div>
            <div className={cx(styles.gvSm)} style={{ color: color.violet }}>
              {meta.crm.tier}
            </div>
          </div>
          <div>
            <div className={styles.gl}>{t('debt')}</div>
            <div className={cx(styles.gvSm)} style={{ color: color.brandInk }}>
              {fmt.money(meta.crm.debt)}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={cx(styles.h, styles.hTight)}>{t('others')}</div>
        {meta.crm.others.map((o) => (
          <div key={o.code} className={cx(styles.kv, styles.kvOther)}>
            <span>{`${o.code} · ${o.title}`}</span>
            <b className={styles.green}>{tr(o.value)}</b>
          </div>
        ))}
      </div>
    </>
  );
}

export function AiTab({ meta }: { meta: ContractsMeta }) {
  const t = useTranslations('contracts.detail');
  const { styles, cx } = useContractTabStyles();
  return (
    <>
      <div className={styles.card}>
        <div className={cx(styles.h, styles.hTight)}>{t('insight')}</div>
        <div className={styles.insight}>
          <Icon name="ic-spark" size={14} color={color.brandInk} />
          <div>{meta.insight}</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={cx(styles.h, styles.hTight)}>{t('suggest')}</div>
        <div className={styles.sugg}>
          {meta.suggestions.map((s) => (
            <div key={s}>
              <Icon name="ic-arrow" size={13} color={color.brand} />
              {s}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function FilesTab({ meta }: { meta: ContractsMeta }) {
  const t = useTranslations('contracts.detail');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useContractTabStyles();
  const by = (b: string) => (b === 'esign' || b === 'customer' ? t(`fileBy.${b}`) : b);
  return (
    <div className={cx(styles.card, styles.flush)}>
      <div className={cx(styles.h, styles.hFiles)}>{t('files')}</div>
      {meta.files.map((f) => (
        <div key={f.name} className={styles.file}>
          <div className={styles.ext} style={{ background: EXT_BG[f.ext] ?? color.text3 }}>
            {f.ext.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.fName}>{f.name}</div>
            <div className={styles.fMeta}>
              {f.size
                ? t('fileMetaSize', { by: by(f.by), at: fmt.date(f.at).slice(0, 5), size: f.size })
                : t('fileMeta', { by: by(f.by), at: fmt.date(f.at).slice(0, 5) })}
            </div>
          </div>
          <button
            type="button"
            className={styles.open}
            onClick={() => void message.info(t('opening', { name: f.name }))}
          >
            {t('open')}
          </button>
        </div>
      ))}
      <button type="button" className={styles.upload} onClick={() => void message.info(t('uploading'))}>
        {t('upload')}
      </button>
    </div>
  );
}

export function HistoryTab({ c }: { c: Contract }) {
  const t = useTranslations('contracts.detail');
  const fmt = useFmt();
  const { styles } = useContractTabStyles();
  const events = [...c.events].reverse();
  return (
    <div className={styles.tl} data-testid="ct-history">
      {events.map((e, i) => (
        <div key={`${e.type}-${i}`} className={styles.ev}>
          <span className={styles.evDot} style={{ background: EV_DOT[e.type] ?? color.text4 }} />
          <div className={styles.evT}>{t(`ev.${e.type}` as never)}</div>
          <div className={styles.evM}>
            {t('evMeta', {
              at: `${fmt.date(e.at)} ${fmt.time(e.at)}`,
              actor: e.actor === 'system' ? t('system') : e.actor,
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
