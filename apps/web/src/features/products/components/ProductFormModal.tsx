// Modal thêm / sửa sản phẩm — prototype L4069–4152 (560px): thông tin chung 2 cột, khối theo loại, thuộc tính → biến thể.
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ApiRequestError } from '@appchat/shared';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCustomDraft } from '@/shared/custom-fields';
import { useProductFormStyles } from '../styles/form.styles';
import { useProductsUi } from '../products-store';
import { productQuery } from '../api';
import { initialDraft, toInput, useProductForm } from '../hooks/useProductForm';
import { useProductDescription } from '../hooks/useProductDescription';
import { ProductDescriptionEditor } from './ProductDescriptionEditor';
import { TypeSections } from './TypeSections';
import type { Product, ProductType, ProductsMeta } from '../types';

const TYPES: ProductType[] = ['physical', 'service', 'combo', 'package', 'digital', 'rental'];
const CHANNELS = ['all', 'zalo_personal', 'webchat', 'shopee'] as const;

export function ProductFormModal({ meta }: { meta: ProductsMeta }) {
  const ui = useProductsUi();
  const edit = ui.form === 'edit' && ui.target ? ui.target : null;
  const q = useQuery({ ...productQuery(edit ?? ''), enabled: !!edit });
  if (!ui.form || (edit && !q.data)) return null;
  // key theo đối tượng sửa / lượt điền sẵn để form khởi tạo lại, không cần setState trong effect
  return (
    <ProductForm
      key={`${edit ?? 'new'}:${JSON.stringify(ui.prefill)}`}
      meta={meta}
      product={edit ? q.data : undefined}
    />
  );
}

function ProductForm({ meta, product }: { meta: ProductsMeta; product?: Product }) {
  const t = useTranslations('products.form');
  const tSrc = useTranslations('products.source');
  const tSt = useTranslations('products.status');
  const { styles, cx } = useProductFormStyles();
  const ui = useProductsUi();
  const f = useProductForm(initialDraft(meta.categories, product, ui.prefill));
  const cf = useCustomDraft('product', product?.custom);
  // Điền sẵn từ Trợ lý có mô tả → chữ thuần (không áp tài liệu cũ); không thì mở lại đúng tài liệu đã lưu.
  const seeded = ui.prefill?.description != null;
  const ed = useProductDescription({ doc: seeded ? null : product?.description_doc, plain: f.d.description });
  const [cats, setCats] = useState(meta.categories);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const create = useAction<{ product_id: string }>('product.create');
  const update = useAction('product.update');
  const addCat = useAction('category.create');
  const close = () => ui.set({ form: null, target: null, prefill: null });

  const saveCat = async () => {
    const name = newCat?.trim();
    if (!name) return;
    if (await addCat.run({ name }, { silent: true })) {
      setCats((c) => (c.includes(name) ? c : [...c, name]));
      f.set('category', name);
      setNewCat(null);
    }
  };

  const save = async () => {
    if (!f.valid) return setErr(t('required'));
    const c = cf.collect(product ? 'update' : 'create');
    if (!c.ok) return;
    // Mô tả: sửa mà không chạm vùng soạn → không gửi (giữ nguyên tài liệu đã lưu); tạo mới rỗng → bỏ qua.
    const desc = product ? (ed.dirty || seeded ? ed.value : {}) : ed.value.description ? ed.value : {};
    const input = { ...toInput(f.d), ...desc, ...(c.custom ? { custom: c.custom } : {}) };
    const onError = (e: ApiRequestError) => cf.absorb(e.error.fields);
    const res = product
      ? await update.run(
          {
            product_id: product.id,
            patch: input,
            ...(product.version ? { if_version: product.version } : {}),
          },
          { onError },
        )
      : await create.run(input, { onError });
    if (res) close();
  };

  const field = (label: string, node: ReactNode, wide?: boolean) => (
    <div className={wide ? styles.wide : undefined}>
      <label className={styles.label}>{label}</label>
      {node}
    </div>
  );

  return (
    <ModalShell
      open
      onClose={close}
      width={560}
      flush
      dense
      stacked={!!ui.detail}
      title={
        <>
          {product ? t('editTitle') : t('title')}
          <div className={styles.sub}>{t('sub')}</div>
        </>
      }
      icon="ic-box"
      iconColor={color.teal}
      iconBg={color.tealBg}
      closeLabel={t('close')}
      testId="pd-form"
      footer={
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={styles.save} onClick={() => void save()} data-testid="pd-save">
            <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
            {product ? t('saveEdit') : t('save')}
          </button>
        </div>
      }
    >
      <div className={cx(styles.grid, styles.head)}>
        {field(
          t('name'),
          <input
            className={styles.input}
            placeholder={t('namePh')}
            value={f.d.name}
            onChange={(e) => f.set('name', e.target.value)}
            data-testid="pd-f-name"
          />,
          true,
        )}
        {field(
          t('type'),
          <>
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.type}
              onChange={(e) => f.set('type', e.target.value as ProductType)}
              data-testid="pd-f-type"
            >
              {TYPES.map((k) => (
                <option key={k} value={k}>
                  {t(`types.${k}`)}
                </option>
              ))}
            </select>
            <div className={styles.hint}>{t(`typeHint.${f.d.type}`)}</div>
          </>,
        )}
        {field(
          t('category'),
          <>
            <div className={styles.catRow}>
              <select
                className={cx(styles.input, styles.select)}
                value={f.d.category}
                onChange={(e) => f.set('category', e.target.value)}
                data-testid="pd-f-category"
              >
                {cats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.plus}
                title={t('newCat')}
                aria-label={t('newCat')}
                onClick={() => setNewCat(newCat === null ? '' : null)}
                data-testid="pd-newcat"
              >
                {t('plus')}
              </button>
            </div>
            {newCat !== null ? (
              <div className={styles.newCat}>
                <input
                  className={cx(styles.input, styles.newCatInput)}
                  placeholder={t('newCatPh')}
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  data-testid="pd-newcat-name"
                />
                <button
                  type="button"
                  className={styles.newCatBtn}
                  onClick={() => void saveCat()}
                  data-testid="pd-newcat-save"
                >
                  {t('createCat')}
                </button>
              </div>
            ) : null}
          </>,
        )}
        {field(
          t('price'),
          <input
            className={styles.input}
            inputMode="numeric"
            placeholder={t('pricePh')}
            value={f.d.price}
            onChange={(e) => f.money('price')(e.target.value)}
            data-testid="pd-f-price"
          />,
        )}
        {field(
          t('status'),
          <select
            className={cx(styles.input, styles.select)}
            value={f.d.status}
            onChange={(e) => f.set('status', e.target.value as 'active' | 'draft')}
          >
            <option value="active">{tSt('active')}</option>
            <option value="draft">{tSt('draft')}</option>
          </select>,
        )}
        {field(
          t('channel'),
          <select
            className={cx(styles.input, styles.select)}
            value={f.d.channel}
            onChange={(e) => f.set('channel', e.target.value)}
          >
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? t('channelAll') : tSrc(c)}
              </option>
            ))}
          </select>,
        )}
        {field(
          t('desc'),
          <ProductDescriptionEditor ed={ed} />,
          true,
        )}
      </div>
      {err ? <div className={styles.err}>{err}</div> : null}
      <TypeSections f={f} cf={cf} />
    </ModalShell>
  );
}
