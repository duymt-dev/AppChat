// Nội dung 5 tab drawer sản phẩm — prototype L5703–5748: Tổng quan · CRM · AI · Tệp · Lịch sử.
'use client';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useDetailStyles } from '../styles/detail.styles';
import { useProductsUi } from '../products-store';
import type { Product, ProductsMeta } from '../types';

const EXT_BG: Record<string, string> = {
  pdf: color.dangerStrong,
  docx: color.blue,
  xlsx: color.okStrong,
  jpg: color.violet,
  png: color.violet,
  mp4: color.warn,
};

export function OverviewTab({ p }: { p: Product }) {
  const t = useTranslations('products.detail');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useDetailStyles();
  const canManage = useCan('catalog.manage');
  const set = useProductsUi((s) => s.set);
  const revenue = fmt.moneyShort(String(Number(p.price) * p.sold));
  const tSrc = useTranslations('products.source');
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('info')}</div>
        <div className={styles.kv}>
          <span>{t('category')}</span>
          <b>{p.category}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('desc')}</span>
          <b>{p.description}</b>
        </div>
        <div className={cx(styles.kv, styles.bInk)}>
          <span>{t('revenue')}</span>
          <b>{revenue}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('channels')}</span>
          <b>{t('chanCount', { n: p.channels.length })}</b>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.h}>{t('syncTitle')}</div>
        <div className={styles.chans}>
          {p.channels.map((ch) => (
            <span key={ch} className={styles.chan}>
              <span className={styles.dot} />
              {tSrc(ch as never)}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.acts}>
        {canManage ? (
          <button
            type="button"
            className={styles.act}
            onClick={() => set({ form: 'edit', target: p.id, prefill: null })}
            data-testid="pd-edit"
          >
            <Icon name="ic-cog" size={14} color={color.text3} />
            {t('edit')}
          </button>
        ) : null}
        <button
          type="button"
          className={cx(styles.act, styles.actPrimary)}
          onClick={() => void message.info(t('sync'))}
        >
          <Icon name="ic-refresh" size={14} color={color.white} strokeWidth={1.9} />
          {t('sync')}
        </button>
      </div>
    </>
  );
}

export function CrmTab({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products.detail');
  const router = useRouter();
  const { styles, cx } = useDetailStyles();
  const DOCS = [
    ['quotes', '/quotes'],
    ['orders', '/orders'],
    ['invoices', '/invoices'],
  ] as const;
  return (
    <>
      <div className={styles.card}>
        <div className={styles.h}>{t('perf')}</div>
        <div className={styles.stats}>
          {meta.crm_stats.map(([k, v, c]) => (
            <div key={k}>
              <div className={styles.kpiL}>{t(`crm.${k}` as never)}</div>
              <div className={styles.statV} style={{ color: c }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cx(styles.card, styles.cardFlush)}>
        <div className={cx(styles.h, styles.hFlush)}>{t('topBuyers')}</div>
        {meta.crm_buyers.map(([n, m, ini]) => (
          <div key={n} className={styles.buyer}>
            <span className={styles.avatar}>{ini}</span>
            <div className={styles.grow}>
              <div className={styles.fName}>{n}</div>
              <div className={styles.fMeta}>{m}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.card}>
        <div className={styles.h}>{t('docs')}</div>
        {DOCS.map(([k, route]) => (
          <button key={k} type="button" className={styles.docRow} onClick={() => router.push(route)}>
            <span className={styles.docName}>{t(k)}</span>
            <span className={styles.docView}>{t('view')}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export function AiTab() {
  const t = useTranslations('products.detail');
  const { message } = App.useApp();
  const { styles } = useDetailStyles();
  return (
    <div className={styles.card}>
      <div className={styles.h}>{t('aiTitle')}</div>
      <div className={styles.ai}>
        <span className={styles.aiSpark}>{t('spark')}</span>
        <div>{t('aiText')}</div>
      </div>
      <div className={styles.aiActs}>
        <button type="button" className={styles.aiAct} onClick={() => void message.info(t('aiDoing'))}>
          <Icon name="ic-spark" size={14} color={color.brand} />
          {t('aiCombo')}
        </button>
        <button type="button" className={styles.aiAct} onClick={() => void message.info(t('aiDoing'))}>
          <Icon name="ic-mega" size={14} color={color.pink} />
          {t('aiAds')}
        </button>
      </div>
    </div>
  );
}

export function FilesTab({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products.detail');
  const { message } = App.useApp();
  const { styles, cx } = useDetailStyles();
  return (
    <div className={cx(styles.card, styles.cardFlush)}>
      <div className={cx(styles.h, styles.hFlush)}>{t('filesTitle')}</div>
      {meta.files.map(([n, ext, m]) => (
        <div key={n} className={styles.file}>
          <div className={styles.ext} style={{ background: EXT_BG[ext] ?? color.text3 }}>
            {ext.toUpperCase()}
          </div>
          <div className={styles.grow}>
            <div className={styles.fName}>{n}</div>
            <div className={styles.fMeta}>{m}</div>
          </div>
          <button type="button" className={styles.open} onClick={() => void message.info(n)}>
            {t('open')}
          </button>
        </div>
      ))}
      <button type="button" className={styles.upload}>
        {t('upload')}
      </button>
    </div>
  );
}

export function HistoryTab({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products.detail.history');
  const { styles } = useDetailStyles();
  return (
    <div className={styles.timeline}>
      {meta.history.map(([k, c, m]) => (
        <div key={k} className={styles.tlItem}>
          <span className={styles.tlDot} style={{ background: c }} />
          <div className={styles.tlT}>{t(k as never)}</div>
          <div className={styles.tlM}>{m}</div>
        </div>
      ))}
    </div>
  );
}
