// Nội dung 5 tab drawer sản phẩm — prototype L5703–5748: Tổng quan · CRM · AI · Tệp · Lịch sử.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { EmbeddedRecordAssistant } from '@/shared/assistant/record-intent/RecordDrawerSection';
import { useDetailStyles } from '../styles/detail.styles';
import { useProductsUi } from '../products-store';
import { productActivityQuery } from '../api';
import { ProductDescriptionView } from './ProductDescriptionView';
import { StockAdjustModal } from './StockAdjustModal';
import type { Product, ProductActivity, ProductsMeta } from '../types';

const KIND_DOT: Record<ProductActivity['kind'], string> = {
  create: color.text4,
  update: color.blue,
  price: color.violet,
  archive: color.dangerStrong,
  restore: color.okStrong,
  stock: color.blue,
};

export function OverviewTab({ p }: { p: Product }) {
  const t = useTranslations('products.detail');
  const fmt = useFmt();
  const { styles, cx } = useDetailStyles();
  const canManage = useCan('catalog.manage');
  const canStock = useCan('stock.adjust');
  const [adjusting, setAdjusting] = useState(false);
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
          <ProductDescriptionView doc={p.description_doc} plain={p.description} className={styles.kvDoc} />
        </div>
        <div className={cx(styles.kv, styles.bInk)}>
          <span>{t('revenue')}</span>
          <b>{revenue}</b>
        </div>
        <div className={styles.kv}>
          <span>{t('channels')}</span>
          <b>{t('chanCount', { n: p.channels.length })}</b>
        </div>
        {p.stock !== null ? (
          <div className={cx(styles.kv, p.low_stock && styles.bInk)} data-testid="pd-stock-value">
            <span>{t('stock')}</span>
            <b>{p.low_stock ? t('stockLow', { n: fmt.number(p.stock) }) : fmt.number(p.stock)}</b>
          </div>
        ) : null}
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
        {canStock && p.type === 'physical' ? (
          <button
            type="button"
            className={cx(styles.act, styles.actPrimary)}
            onClick={() => setAdjusting(true)}
            data-testid="pd-stock-open"
          >
            <Icon name="ic-box" size={14} color={color.white} strokeWidth={1.9} />
            {t('adjust')}
          </button>
        ) : null}
      </div>
      {adjusting ? <StockAdjustModal p={p} onClose={() => setAdjusting(false)} /> : null}
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
        {meta.crm_stats.length ? null : <div className={styles.fMeta}>{t('noSales')}</div>}
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
        {meta.crm_buyers.length ? null : (
          <div className={cx(styles.fMeta, styles.emptyRow)}>{t('noBuyers')}</div>
        )}
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

export function AiTab({ p }: { p: Product }) {
  const t = useTranslations('products.detail');
  const { styles } = useDetailStyles();
  return (
    <div className={styles.card}>
      <div className={styles.h}>{t('aiTitle')}</div>
      <div className={styles.ai}>
        <span className={styles.aiSpark}>{t('spark')}</span>
        <div>{t('aiText')}</div>
      </div>
      {/* Combo / quảng cáo: đề xuất CHỈ ĐỌC qua Trợ lý — không tạo sản phẩm / chiến dịch khi bấm (TIP-023g §3). */}
      <EmbeddedRecordAssistant
        module="products"
        scopeOf={{
          module: 'products',
          entity: 'product',
          id: p.id,
          label: p.name,
          ...(p.version !== undefined ? { version: p.version } : {}),
        }}
        choices={PRODUCT_CHOICES}
        testId="pd-rai"
      />
    </div>
  );
}

const PRODUCT_CHOICES = [
  { intent: 'product_combo' as const, labelKey: 'intent.product_combo' },
  { intent: 'product_campaign' as const, labelKey: 'intent.product_campaign' },
  { intent: 'inspect' as const, labelKey: 'intent.inspect' },
];

export function HistoryTab({ p }: { p: Product }) {
  const t = useTranslations('products.detail');
  const { styles } = useDetailStyles();
  const items = useQuery(productActivityQuery(p.id)).data ?? [];
  return (
    <div className={styles.timeline} data-testid="pd-history">
      {items.length ? null : <div className={styles.tlM}>{t('noHistory')}</div>}
      {items.map((x) => (
        <div key={x.id} className={styles.tlItem} data-kind={x.kind}>
          <span className={styles.tlDot} style={{ background: KIND_DOT[x.kind] }} />
          <div className={styles.tlT}>{x.text}</div>
          <div className={styles.tlM}>{t('by', { when: x.when, by: x.by })}</div>
        </div>
      ))}
    </div>
  );
}
