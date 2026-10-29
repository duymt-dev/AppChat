// Mục Tổng quan — prototype L5824–5858: workspace của bạn (3 thẻ), logo + mã workspace, form Thông tin chung (workspace.update), vùng nguy hiểm.
// Đóng băng / xuất / xoá workspace do Quản trị nền tảng xử lý (Blueprint §3.4 admin.workspace.*) → ở đây gửi yêu cầu qua hỗ trợ.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useGeneralStyles } from '../styles/general.styles';
import { workspaceQuery } from '../api';
import type { Workspace } from '../types';

type FormKey = 'legal_name' | 'website' | 'tax_code' | 'address' | 'support_phone' | 'admin_email';
const FIELDS: [FormKey, 'full' | 'w200' | 'w240', boolean][] = [
  ['legal_name', 'full', true],
  ['website', 'full', true],
  ['tax_code', 'w200', true],
  ['address', 'full', false],
  ['support_phone', 'w200', false],
  ['admin_email', 'w240', false],
];
const DANGER = ['freeze', 'export', 'delete'] as const;

function InfoForm({ ws }: { ws: Workspace }) {
  const t = useTranslations('settings.general');
  const s = useSectionStyles();
  const { styles, cx } = useGeneralStyles();
  const canEdit = useCan('settings.manage');
  const save = useAction('workspace.update');
  const pick = (w: Workspace) => Object.fromEntries(FIELDS.map(([k]) => [k, w[k]])) as Record<FormKey, string>;
  const [v, setV] = useState(() => pick(ws));
  const submit = () => {
    const { legal_name, ...rest } = v;
    void save.run({ name: legal_name, ...rest, ...(rest.admin_email ? {} : { admin_email: undefined }) });
  };
  return (
    <div className={styles.form} data-testid="st-general-form">
      <div className={styles.formT}>{t('info')}</div>
      <div className={styles.formS}>{t('infoD')}</div>
      {FIELDS.map(([k, w, hint]) => (
        <div key={k} className={styles.fRow}>
          <div className={styles.fLabel}>
            <div className={styles.fL}>{t(`f.${k}`)}</div>
            {hint ? <div className={styles.fH}>{t(`h.${k}`)}</div> : null}
          </div>
          <input
            className={cx(s.styles.input, w === 'w200' && s.styles.inputW200, w === 'w240' && s.styles.inputW240)}
            value={v[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
            disabled={!canEdit}
            aria-label={t(`f.${k}`)}
            data-testid={`st-ws-${k}`}
          />
        </div>
      ))}
      {canEdit ? (
        <div className={styles.fFoot}>
          <button type="button" className={cx(s.styles.ghost, s.styles.sm)} onClick={() => setV(pick(ws))}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(s.styles.primary, s.styles.sm)} disabled={save.isPending} onClick={submit} data-testid="st-ws-save">
            {t('save')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function GeneralSection() {
  const t = useTranslations('settings.general');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles, cx } = useGeneralStyles();
  const isOwner = useCan('workspace.transfer_ownership');
  const q = useQuery(workspaceQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <div className={s.card}>
            <div className={s.between}>
              <div className={s.grow}>
                <div className={s.cT}>{t('mine')}</div>
                <div className={s.cS}>{t('mineD')}</div>
              </div>
              <button type="button" className={cx(s.primary, s.sm)} onClick={() => void message.info(t('buySoon'))}>
                <Icon name="ic-plus" size={13} color={color.white} strokeWidth={2} />
                {t('buy')}
              </button>
            </div>
            <div className={styles.wsGrid}>
              {q.data.workspaces.map((w) => (
                <div key={w.id} className={cx(styles.ws, w.current && styles.wsOn)} data-ws={w.id}>
                  <div className={styles.wsHead}>
                    <span className={styles.wsAv} style={{ background: w.color }}>
                      {w.name.split(' ').slice(-1)[0]![0]}
                    </span>
                    <div className={s.grow}>
                      <div className={styles.wsName}>{w.name}</div>
                      <div className={styles.wsId}>{w.id}</div>
                    </div>
                  </div>
                  <div className={styles.pills}>
                    <span>{w.plan}</span>
                    <span>{t('seats', { n: w.seats })}</span>
                  </div>
                  <button type="button" className={styles.wsBtn} onClick={() => !w.current && void message.success(t('switched', { n: w.name }))}>
                    {w.current ? t('current') : t('switch')}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className={s.card}>
            <div className={styles.logoRow}>
              <div className={styles.logo}>{q.data.workspace.initial}</div>
              <div className={s.grow}>
                <div className={styles.wsTitle}>{q.data.workspace.name}</div>
                <div className={s.muted}>
                  {t('wsId')} <span className={styles.code}>{q.data.workspace.id}</span>
                </div>
              </div>
              <button type="button" className={cx(s.ghost, s.sm)} onClick={() => void message.info(t('logoSoon'))}>
                <Icon name="ic-doc" size={13} color={color.text3} />
                {t('logo')}
              </button>
            </div>
          </div>
          <InfoForm ws={q.data.workspace} />
          {isOwner ? (
            <>
              <div className={styles.dzT}>{t('danger')}</div>
              <div className={cx(s.muted)}>{t('dangerD')}</div>
              <div className={styles.dz}>
                {DANGER.map((k) => (
                  <div key={k} className={styles.dzRow}>
                    <div className={s.grow}>
                      <div className={k === 'delete' ? styles.dzRed : styles.dzL}>{t(`dz.${k}`)}</div>
                      <div className={s.muted}>{t(`dz.${k}D`)}</div>
                    </div>
                    <button
                      type="button"
                      className={k === 'delete' ? s.dangerBtn : k === 'freeze' ? s.dangerGhost : cx(s.ghost, s.sm)}
                      onClick={() => void message.info(t('dz.requested'))}
                    >
                      {t(`dz.${k}Btn`)}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </PageStates>
  );
}
