// Hộp Thêm / Sửa trường dữ liệu — prototype L932–960 (600px): Tên *, Kiểu dữ liệu (theo enum custom_field_def — Blueprint §2), Tuỳ chọn
// (ngăn bởi /) khi là lựa chọn, Bắt buộc / AI tự cập nhật; "Tuỳ chọn nâng cao": hiển thị tại (6 công tắc), vai trò được xem (5 vai trò §3.5,
// rỗng = mọi vai trò), điều kiện. Trường hệ thống: khoá tên / kiểu. Thêm → custom_field.define; sửa → custom_field.update.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { SYSTEM_ROLES } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useFieldModalStyles } from '../styles/field-modal.styles';
import { useSettingsUi } from '../settings-store';
import { PLACES, type FieldDef, type FieldPlace } from '../types';
import { FormModal } from './FormModal';
import { Switch } from './Switch';

const TYPES = ['text', 'textarea', 'number', 'currency', 'phone', 'email', 'date', 'picklist', 'multi', 'file'] as const;
const WITH_OPTS = ['picklist', 'multi'];
const OPEN = '▾';
const SHUT = '▸';
const BLANK: Record<FieldPlace, boolean> = { list: false, kanban: false, form: true, filter: false, detail: true, export: true };

export function FieldModal({ fieldKey, rows }: { fieldKey?: string; rows: FieldDef[] }) {
  const t = useTranslations('settings.fields.modal');
  const tf = useTranslations('settings.fields');
  const tr = useTranslations('settings.roleName');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles, cx } = useFieldModalStyles();
  const ui = useSettingsUi();
  const cur = rows.find((f) => f.key === fieldKey);
  const [d, setD] = useState({
    label: cur?.label ?? '',
    type: (cur?.type ?? 'text') as (typeof TYPES)[number],
    options: cur?.options ?? '',
    required: cur?.required ?? false,
    ai: cur?.ai ?? false,
    visible_in: cur?.visible_in ?? BLANK,
    roles: cur?.roles ?? [],
    condition: cur?.condition ?? '',
  });
  const [adv, setAdv] = useState(false);
  const define = useAction('custom_field.define');
  const update = useAction('custom_field.update');
  const patch = (p: Partial<typeof d>) => setD({ ...d, ...p });
  const close = () => ui.set({ fieldModal: null });
  const save = async () => {
    if (!d.label.trim()) return void message.error(t('errName'));
    const body = { ...d, label: d.label.trim(), options: WITH_OPTS.includes(d.type) ? d.options.trim() : '', condition: d.condition.trim() };
    const r = cur
      ? await update.run({ entity: ui.fieldEntity, fields: [{ key: cur.key, ...(cur.sys ? { ...body, label: undefined, type: undefined } : body) }] })
      : await define.run({ entity: ui.fieldEntity, ...body });
    if (r) close();
  };
  return (
    <FormModal
      open
      wide
      title={cur ? t('editTitle') : t('title')}
      onClose={close}
      onSave={() => void save()}
      saveLabel={t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={define.isPending || update.isPending}
      testId="st-field-modal"
    >
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={styles.input} value={d.label} disabled={cur?.sys} onChange={(e) => patch({ label: e.target.value })} placeholder={t('namePh')} data-testid="st-fm-name" />
      </div>
      <div>
        <div className={s.label}>{t('type')}</div>
        <select className={styles.input} value={d.type} disabled={cur?.sys} onChange={(e) => patch({ type: e.target.value as (typeof TYPES)[number] })} data-testid="st-fm-type">
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {tf(`type.${x}`)}
            </option>
          ))}
        </select>
      </div>
      {WITH_OPTS.includes(d.type) ? (
        <div>
          <div className={s.label}>{t('opts')}</div>
          <input className={styles.input} value={d.options} onChange={(e) => patch({ options: e.target.value })} placeholder={t('optsPh')} data-testid="st-fm-opts" />
        </div>
      ) : null}
      <div className={styles.two}>
        <div className={styles.tog}>
          <span className={styles.togL}>{t('required')}</span>
          <Switch on={d.required} onChange={(v) => patch({ required: v })} label={t('required')} testId="st-fm-req" />
        </div>
        <div className={styles.tog}>
          <span className={styles.togL}>{t('ai')}</span>
          <Switch on={d.ai} onChange={(v) => patch({ ai: v })} label={t('ai')} />
        </div>
      </div>
      <button type="button" className={styles.adv} onClick={() => setAdv(!adv)} aria-expanded={adv} data-testid="st-fm-adv">
        <span className={styles.advT}>{t('adv')}</span>
        <span className={styles.advS}>{t('advS')}</span>
        <span className={s.grow} />
        <span className={styles.advS}>{adv ? OPEN : SHUT}</span>
      </button>
      {adv ? (
        <>
          <div>
            <div className={s.label}>{t('places')}</div>
            <div className={styles.grid2}>
              {PLACES.map((p) => (
                <div key={p} className={styles.place}>
                  <span className={styles.togL}>{t(`place.${p}`)}</span>
                  <Switch small on={d.visible_in[p]} onChange={(v) => patch({ visible_in: { ...d.visible_in, [p]: v } })} label={t(`place.${p}`)} testId={`st-fm-place-${p}`} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={s.label}>
              {t('roles')} <span className={styles.hint}>{t('rolesHint')}</span>
            </div>
            <div className={styles.roles}>
              {SYSTEM_ROLES.map((r) => {
                const on = d.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={on}
                    className={cx(styles.role, on && styles.roleOn)}
                    onClick={() => patch({ roles: on ? d.roles.filter((x) => x !== r) : [...d.roles, r] })}
                    data-testid={`st-fm-role-${r}`}
                  >
                    <Icon name="ic-shield" size={13} color="currentColor" strokeWidth={2} />
                    {tr(r)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className={s.label}>
              {t('cond')} <span className={styles.hint}>{t('optional')}</span>
            </div>
            <input className={styles.input} value={d.condition} onChange={(e) => patch({ condition: e.target.value })} placeholder={t('condPh')} />
          </div>
        </>
      ) : null}
      {cur?.sys ? <div className={s.muted}>{t('sysNote')}</div> : null}
    </FormModal>
  );
}
