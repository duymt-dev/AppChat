// Mục Trợ lý AI website — prototype L7184–7301: 4 KPI, thẻ cấu hình (tên, lời chào, chat AI, pre-chat, nút hành động, AI Agent phụ trách,
// mã nhúng) + xem trước 360px. Mọi thay đổi ghi qua webchat.update_widget (một lần mỗi thao tác — bật/tắt, chọn, rời ô nhập);
// công tắc "Bật widget" (TIP-017): lần bật đầu tạo tài khoản webchat + mã nhúng thật.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useWidgetStyles } from '../styles/widget.styles';
import { widgetQuery } from '../api';
import type { Widget } from '../types';
import { WidgetAiBox } from './WidgetAiBox';
import { WidgetPreview } from './WidgetPreview';
import { Switch } from './Switch';

const KPIS: [keyof Widget['kpis'] | 'rate' | 'run', IconName, string][] = [
  ['clicks', 'ic-globe', color.blue],
  ['chats', 'ic-inbox', color.okStrong],
  ['rate', 'ic-chart', color.amberGold],
  ['run', 'ic-spark', color.violet],
];

function Config({ w }: { w: Widget }) {
  const t = useTranslations('settings.widget');
  const { message } = App.useApp();
  const { styles, cx } = useWidgetStyles();
  const save = useAction('webchat.update_widget');
  const [name, setName] = useState(w.name);
  const [greet, setGreet] = useState(w.greeting);
  const put = (patch: Record<string, unknown>) => void save.run(patch, { silent: true });
  return (
    <div className={styles.cfg} data-testid="st-widget">
      <div className={styles.cfgT}>{t('cfgT')}</div>
      <div className={styles.toggle}>
        <div className={styles.grow}>
          <div className={styles.tT}>{t('enabled')}</div>
          <div className={styles.tS}>{t(w.enabled ? 'enabledOn' : 'enabledOff')}</div>
        </div>
        <Switch on={w.enabled} onChange={(v) => put({ enabled: v })} label={t('enabled')} testId="st-wg-enabled" />
      </div>
      <div className={styles.lbl}>{t('name')}</div>
      <input
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== w.name && put({ name: name.trim() })}
        placeholder={t('namePh')}
        data-testid="st-wg-name"
      />
      <div className={styles.lbl}>{t('greet')}</div>
      <input className={styles.input} value={greet} onChange={(e) => setGreet(e.target.value)} onBlur={() => greet !== w.greeting && put({ greeting: greet })} data-testid="st-wg-greet" />
      <div className={styles.toggle}>
        <div className={styles.grow}>
          <div className={styles.tT}>{t('aiChat')}</div>
          <div className={styles.tS}>{t('aiChatD')}</div>
        </div>
        <Switch on={w.ai_chat} onChange={(v) => put({ ai_chat: v })} label={t('aiChat')} testId="st-wg-aichat" />
      </div>
      <div className={cx(styles.toggle, styles.toggleLast)}>
        <div className={styles.grow}>
          <div className={styles.tT}>{t('prechat')}</div>
          <div className={styles.tS}>{t('prechatD')}</div>
        </div>
        <Switch on={w.prechat} onChange={(v) => put({ prechat: v })} label={t('prechat')} testId="st-wg-prechat" />
      </div>
      <div className={styles.actHead}>
        <div className={styles.lbl}>{t('actions')}</div>
        <span className={styles.grow} />
        <button type="button" className={styles.link} onClick={() => void message.info(t('addActionSoon'))}>
          {t('addAction')}
        </button>
      </div>
      <div className={styles.acts}>
        {w.actions.map((a) => (
          <div key={a.key} className={styles.act}>
            <span className={styles.actDot} style={{ background: a.color }} />
            <div className={styles.grow}>
              <div className={styles.tT}>{t(`act.${a.key}`)}</div>
              <div className={styles.tS}>{t(`actType.${a.key}`)}</div>
            </div>
            <Switch
              small
              on={a.on}
              onChange={(v) => put({ actions: w.actions.map((x) => ({ key: x.key, on: x.key === a.key ? v : x.on })) })}
              label={t(`act.${a.key}`)}
              testId={`st-wg-act-${a.key}`}
            />
            <button type="button" className={styles.iconBtn} onClick={() => void message.info(t('addActionSoon'))} aria-label={t('edit')}>
              <Icon name="ic-doc" size={13} color="currentColor" />
            </button>
            <button
              type="button"
              className={cx(styles.iconBtn, styles.iconDanger)}
              onClick={() => put({ actions: w.actions.filter((x) => x.key !== a.key).map((x) => ({ key: x.key, on: x.on })) })}
              aria-label={t('del')}
              data-testid={`st-wg-del-${a.key}`}
            >
              <Icon name="ic-trash" size={13} color="currentColor" />
            </button>
          </div>
        ))}
      </div>
      <WidgetAiBox w={w} put={put} />
      <div className={styles.lbl}>{t('embed')}</div>
      <div className={styles.embedWrap}>
        <pre className={styles.embed} data-testid="st-wg-embed">
          {w.embed || t('embedEmpty')}
        </pre>
        <button
          type="button"
          className={styles.copy}
          disabled={!w.embed}
          onClick={() => {
            void navigator.clipboard?.writeText(w.embed);
            void message.success(t('copied'));
          }}
        >
          {t('copy')}
        </button>
      </div>
    </div>
  );
}

export function WidgetSection() {
  const t = useTranslations('settings.widget');
  const { styles } = useWidgetStyles();
  const q = useQuery(widgetQuery());
  const k = q.data?.kpis;
  const val = (key: (typeof KPIS)[number][0]) =>
    !k ? '' : key === 'rate' ? `${Math.round((k.chats / k.clicks) * 100)}%` : key === 'run' ? `${k.running}/${k.total}` : k[key].toLocaleString('vi-VN');
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <div className={styles.kpis}>
            {KPIS.map(([key, ic, c]) => (
              <div key={key} className={styles.kpi}>
                <span className={styles.kIc}>
                  <Icon name={ic} size={16} color={c} />
                </span>
                <div className={styles.grow}>
                  <div className={styles.kL}>{t(`kpi.${key}`)}</div>
                  <div className={styles.kV}>{val(key)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.two}>
            <Config key={`${q.data.name}|${q.data.greeting}|${q.data.public_key ?? ''}`} w={q.data} />
            <WidgetPreview w={q.data} />
          </div>
        </>
      ) : null}
    </PageStates>
  );
}
