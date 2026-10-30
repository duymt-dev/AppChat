// 5 tab drawer đơn hàng — prototype L5589–5617: Tổng quan · CRM · AI · Tệp · Lịch sử.
// Tổng quan thêm theo COMMERCE §4: 2 trục (tiến độ + thanh toán), nguồn / chứng từ gốc, cọc, điểm, vận chuyển nhập tay; đơn sàn khoá dòng (D31).
'use client';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useOrderTabStyles } from '../styles/tabs.styles';
import { PayText, useSvc, useTr } from '../columns';
import { ShippingCard } from './ShippingCard';
import { useOrdersUi } from '../orders-store';
import type { Order, OrdersMeta } from '../types';
import { CustomFieldList } from '@/shared/custom-fields';

const EXT_BG: Record<string, string> = { pdf: color.dangerStrong, xlsx: color.okGreen, jpg: color.violet };
const EV_DOT: Record<string, string> = {
  created: color.blue,
  imported: color.blue,
  confirmed: color.blue,
  paid: color.brand,
  deposit: color.brand,
  completed: color.brand,
  cancelled: color.dangerDeep,
  refund_requested: color.dangerDeep,
};

export function OverviewTab({ o }: { o: Order }) {
  const t = useTranslations('orders');
  const fmt = useFmt();
  const { styles, cx } = useOrderTabStyles();
  const tr = useTr();
  const svc = useSvc();
  const router = useRouter();
  const ref = o.quote_code || o.contract_code;
  // "Đề nghị thanh toán" / "Gửi link TT" → màn Đề nghị thanh toán với form điền sẵn đơn này (COMMERCE §5).
  const toInvoice = () => {
    useOrdersUi.getState().set({ detail: null, tab: 'overview' });
    router.push(`/invoices?order=${o.id}`);
  };
  return (
    <>
      {o.locked_lines && o.external ? (
        <div className={styles.notice} data-testid="od-locked">
          <Icon name="ic-shield" size={14} color={color.warn} />
          <span>
            {t('detail.locked', { platform: t(`platform.${o.external.platform}` as never) })}
            {' · '}
            {t('detail.platformStatus', { s: o.external.platform_status })}
          </span>
        </div>
      ) : null}
      <div className={styles.card}>
        <div className={styles.h}>{t('detail.info')}</div>
        <div className={styles.kv}>
          <span>{t('detail.svc')}</span>
          <b>{svc(o)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('detail.value')}</span>
          <b className={styles.green}>{tr(o.total)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('detail.pay')}</span>
          <b data-testid="od-pay">
            <PayText o={o} />
          </b>
        </div>
        <div className={styles.kv}>
          <span>{t('detail.at')}</span>
          <b>{fmt.date(o.created_at)}</b>
        </div>
      </div>
      <div className={styles.btns}>
        <button
          type="button"
          className={styles.btn}
          disabled={o.status === 'cancelled' || o.locked_lines}
          onClick={toInvoice}
        >
          <Icon name="ic-send" size={15} color="currentColor" />
          {t('detail.sendLink')}
        </button>
        <button
          type="button"
          className={cx(styles.btn, styles.btnPrimary)}
          disabled={o.status === 'cancelled' || o.locked_lines}
          onClick={toInvoice}
        >
          <Icon name="ic-dl" size={15} color={color.white} />
          {t('detail.invoice')}
        </button>
      </div>
      <div className={cx(styles.card, styles.gapTop)}>
        <div className={styles.kv}>
          <span>{t('detail.status')}</span>
          <b data-testid="od-status-text">{t(`status.${o.status}`)}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('detail.source')}</span>
          <b>{t(`source.${o.source}`)}</b>
        </div>
        {ref ? (
          <div className={styles.kv}>
            <span>{t('detail.ref')}</span>
            <b className={styles.mono}>{ref}</b>
          </div>
        ) : null}
        {o.deposit_required ? (
          <div className={styles.kv}>
            <span>{t('detail.deposit')}</span>
            <b>{fmt.money(o.deposit_amount)}</b>
          </div>
        ) : null}
        <div className={styles.kv}>
          <span>{t('detail.points')}</span>
          <b data-testid="od-points">
            {o.source === 'marketplace'
              ? t('detail.noPoints')
              : t('detail.pointsVal', { n: o.points_earned })}
          </b>
        </div>
        {o.refund_pending ? (
          <div className={styles.kv}>
            <b className={styles.danger} data-testid="od-refund">
              {t('detail.refundPending', { paid: fmt.money(o.paid_total) })}
            </b>
          </div>
        ) : null}
      </div>
      <div className={styles.card}>
        <div className={cx(styles.h, styles.hTight)}>{t('detail.lines')}</div>
        {o.items.map((it, i) => (
          <div key={i} className={styles.kv}>
            <span>{`${it.name} × ${it.qty}`}</span>
            <b>{fmt.money(String(Math.round(it.qty * Number(it.unit_price))))}</b>
          </div>
        ))}
      </div>
      <ShippingCard o={o} />
      <CustomFieldList entity="order" values={o.custom} />
    </>
  );
}

export function CrmTab({ meta }: { meta: OrdersMeta }) {
  const t = useTranslations('orders.detail');
  const fmt = useFmt();
  const { styles } = useOrderTabStyles();
  const tr = useTr();
  return (
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
          <div className={styles.gvSm} style={{ color: color.violet }}>
            {meta.crm.tier}
          </div>
        </div>
        <div>
          <div className={styles.gl}>{t('pointsBal')}</div>
          <div className={styles.gvSm} style={{ color: color.brandInk }}>
            {fmt.number(meta.crm.points)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AiTab({ meta }: { meta: OrdersMeta }) {
  const t = useTranslations('orders.detail');
  const { styles, cx } = useOrderTabStyles();
  return (
    <div className={styles.card}>
      <div className={cx(styles.h, styles.hTight)}>{t('insight')}</div>
      <div className={styles.insight}>
        <Icon name="ic-spark" size={14} color={color.brandInk} />
        <div>{meta.insight}</div>
      </div>
    </div>
  );
}

export function FilesTab({ meta }: { meta: OrdersMeta }) {
  const t = useTranslations('orders.detail');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useOrderTabStyles();
  const by = (b: string) => (b === 'system' || b === 'customer' ? t(`fileBy.${b}`) : b);
  return (
    <div className={cx(styles.card, styles.flush)}>
      <div className={cx(styles.h, styles.hFiles)}>{t('files')}</div>
      {meta.files.map((f) => (
        <div key={f.name} className={styles.file}>
          <div className={styles.ext} style={{ background: EXT_BG[f.ext] ?? color.text3 }}>
            {f.ext.toUpperCase()}
          </div>
          <div className={styles.grow}>
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

export function HistoryTab({ o }: { o: Order }) {
  const t = useTranslations('orders.detail');
  const fmt = useFmt();
  const { styles } = useOrderTabStyles();
  const events = [...o.events].reverse();
  return (
    <div className={styles.tl} data-testid="od-history">
      {events.map((e, i) => {
        const at = `${fmt.date(e.at)} ${fmt.time(e.at)}`;
        const actor = e.actor === 'system' ? t('system') : e.actor;
        return (
          <div key={`${e.type}-${i}`} className={styles.ev}>
            <span className={styles.evDot} style={{ background: EV_DOT[e.type] ?? color.text4 }} />
            <div className={styles.evT}>{t(`ev.${e.type}` as never)}</div>
            <div className={styles.evM}>
              {e.amount
                ? t('evAmount', { at, actor, amount: fmt.money(e.amount) })
                : t('evMeta', { at, actor })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
