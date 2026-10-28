// Modal "Trường thông tin mở rộng" — prototype L2684–2722 (880px). Bật / tắt bắt buộc · hiện → custom_field.update; thêm → custom_field.define.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useShellStore } from '@/shared/shell/shell-store';
import { useDedupeStyles } from '../styles/dedupe.styles';
import { useFormStyles } from '../styles/form.styles';
import { useCrmUi } from '../crm-store';
import { customFieldsQuery } from '../api';
import type { CustomField } from '../types';

const KIND_TONE: Record<string, [string, string]> = {
  picklist: [color.ruleBg, color.blue],
  text: [color.muteBg, color.text3],
  multi: [color.fieldsBg, color.violetInk],
  tier: [color.tierSoftBg, color.amberText],
  lookup: [color.brandBg, color.brandInk],
  tags: [color.ruleBg, color.blue],
};

export function FieldsModal() {
  const t = useTranslations('customers.cf');
  const { styles, cx } = useDedupeStyles();
  const { styles: fs } = useFormStyles();
  const ui = useCrmUi();
  const setDock = useShellStore((s) => s.setDock);
  const list = useQuery(customFieldsQuery()).data;
  const update = useAction('custom_field.update');
  const define = useAction('custom_field.define');
  const [draft, setDraft] = useState<CustomField[] | null>(null);
  const [label, setLabel] = useState('');
  const rows = draft ?? list ?? [];
  const tipVar = t.raw('tipVar') as string;
  const close = () => ui.set({ modal: null });
  const REQ = 'required' as const;
  const VIS = 'visible' as const;
  const flip = (key: string, k: typeof REQ | typeof VIS) => setDraft(rows.map((f) => (f.key === key ? { ...f, [k]: !f[k] } : f)));
  const check = (on: boolean, onClick: () => void, aria: string) => (
    <span className={styles.center}>
      <button type="button" role="checkbox" aria-checked={on} aria-label={aria} className={cx(styles.box, on && styles.boxOn)} onClick={onClick}>
        {on ? <Icon name="ic-check" size={12} color={color.white} strokeWidth={3} /> : null}
      </button>
    </span>
  );
  const save = async () => {
    if (draft && !(await update.run({ entity: 'contact', fields: draft.map(({ key, required, visible }) => ({ key, required, visible })) }))) return;
    close();
  };

  return (
    <ModalShell
      open
      onClose={close}
      width={880}
      title={t('title')}
      icon="ic-cog"
      iconColor={color.violetInk}
      iconBg={color.fieldsBg}
      closeLabel={t('close')}
      testId="crm-fields-modal"
      flush
      footer={
        <>
          <button type="button" className={cx(fs.btn, fs.btnFoot)} onClick={close}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(fs.btn, fs.btnFoot, fs.primary)} onClick={() => void save()}>
            {t('save')}
          </button>
        </>
      }
    >
      <div className={styles.cfBar}>
        <button type="button" className={cx(fs.btn, fs.btnSm, fs.primary)} onClick={async () => label.trim() && (await define.run({ entity: 'contact', label, type: 'text' })) && setLabel('')}>
          <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
          {t('add')}
        </button>
        <input className={cx(fs.input, fs.inputSm)} style={{ maxWidth: 220 }} value={label} placeholder={t('newLabel')} aria-label={t('newLabel')} onChange={(e) => setLabel(e.target.value)} />
        <button
          type="button"
          className={cx(fs.btn, fs.btnSm)}
          onClick={() => {
            close();
            setDock(true);
          }}
        >
          <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
          {t('ai')}
        </button>
        <span className={styles.grow} />
        <span className={styles.cfCount}>{t('count', { n: rows.length, shown: rows.filter((f) => f.visible).length })}</span>
      </div>
      <div className={styles.cfBody}>
        <div className={styles.cfTable}>
          <div className={styles.cfHead}>
            <span />
            <span>{t('label')}</span>
            <span>{t('kind')}</span>
            <span>{t('options')}</span>
            <span>{t('group')}</span>
            <span className={styles.center}>{t('required')}</span>
            <span className={styles.center}>{t('visible')}</span>
          </div>
          {rows.map((f) => {
            const [bg, fg] = KIND_TONE[f.type] ?? KIND_TONE.text!;
            return (
              <div key={f.key} className={styles.cfRow} data-testid="cf-row">
                <span className={styles.grab}>{t('drag')}</span>
                <span className={styles.cfLabel}>{f.label}</span>
                <span>
                  <span className={styles.kind} style={{ background: bg, color: fg }}>
                    {t(`types.${f.type}` as never)}
                  </span>
                </span>
                <span className={styles.opts}>{f.options}</span>
                <span className={styles.grp}>{f.group}</span>
                {check(f.required, () => flip(f.key, REQ), `${t('required')} ${f.label}`)}
                {check(f.visible, () => flip(f.key, VIS), `${t('visible')} ${f.label}`)}
              </div>
            );
          })}
        </div>
        <div className={styles.tip}>
          {t('tipLead')} <b>{t('tipTitle')}</b> {t('tip')}
          <code className={styles.code}>{tipVar}</code>
          {t('tipEnd')}
        </div>
      </div>
    </ModalShell>
  );
}
