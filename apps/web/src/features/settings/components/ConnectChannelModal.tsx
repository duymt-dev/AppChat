// Wizard kết nối kênh 3 bước dùng chung (REQ-B10, prototype L777–868): chọn kênh → xác thực → cấu hình nhanh.
// zalo_personal: QR (channel.zalo.start_login). email: form IMAP/SMTP + Kiểm tra kết nối (channel.test → channel.email.connect).
// webchat: không có bước xác thực riêng — mở thẳng trang cấu hình widget. Kênh ngoài manifest / chưa available → "Sắp có" (D04, D28).
'use client';
import { useCallback, useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { agentsQuery } from '@/features/agents';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelWizardStyles } from '../styles/channel-wizard.styles';
import { useSettingsUi } from '../settings-store';
import { useZaloLogin } from '../hooks/useZaloLogin';
import { ZaloQrStep } from './ZaloQrStep';
import { channelsQuery } from '../api';
import type { ChannelAiMode, ChannelAssignMode } from '../types';

const WIDGET = '/settings/web_widget';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODES: ChannelAiMode[] = ['auto', 'suggest', 'off'];
const ASSIGNS: ChannelAssignMode[] = ['round_robin', 'least_busy', 'shift'];
const PICKABLE = ['zalo_personal', 'email', 'webchat'];

export function ConnectChannelModal() {
  const t = useTranslations('settings.channels.wizard');
  const { message } = App.useApp();
  const router = useRouter();
  const s = useSectionStyles().styles;
  const { styles, cx } = useChannelWizardStyles();
  const wizard = useSettingsUi((x) => x.channelWizard);
  const set = useSettingsUi((x) => x.set);
  const channels = useQuery({ ...channelsQuery('all'), enabled: !!wizard }).data ?? [];
  const agents = useQuery({ ...agentsQuery(), enabled: !!wizard }).data?.data ?? [];
  const email = useAction<{ channel_account_id: string }>('channel.email.connect');
  const test = useAction('channel.test');
  const updateSettings = useAction('channel.update_settings');

  const [label, setLabel] = useState('');
  const [addr, setAddr] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [tested, setTested] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cfgName, setCfgName] = useState('');
  const zalo = useZaloLogin(
    useCallback((id: string) => {
      setAccountId(id);
      useSettingsUi.getState().set({ channelWizard: { type: 'zalo_personal', step: 3 } });
    }, []),
    wizard?.accountId,
  );
  const [agentId, setAgentId] = useState('');
  const [aiMode, setAiMode] = useState<ChannelAiMode>('auto');
  const [assignMode, setAssignMode] = useState<ChannelAssignMode>('round_robin');

  if (!wizard) return null;
  const c = wizard.type ? channels.find((x) => x.type === wizard.type) : null;
  const step = wizard.step;
  const stepLabels = t.raw('steps') as string[];

  const close = () => {
    set({ channelWizard: null });
    setLabel('');
    setAddr('');
    setImapHost('');
    setTested(false);
    setAccountId(null);
    zalo.reset();
    setCfgName('');
    setAgentId('');
    setAiMode('auto');
    setAssignMode('round_robin');
  };

  const pickChannel = (type: string) => {
    const target = channels.find((x) => x.type === type);
    if (!target?.available) return;
    if (type === 'webchat') {
      close();
      router.push(WIDGET);
      return;
    }
    set({ channelWizard: { type, step: 2 } });
  };

  const back = () => set({ channelWizard: { type: wizard.type, step: (step - 1) as 1 | 2 } });

  const runTest = async () => {
    if (!imapHost.trim()) return void message.error(t('errTest'));
    if (await test.run({ type: 'email', fields: { imap_host: imapHost.trim() } })) setTested(true);
  };

  const toStep3 = async () => {
    if (!c) return;
    if (c.type === 'email') {
      if (!EMAIL.test(addr.trim())) return void message.error(t('errEmail'));
      if (!tested) return void message.error(t('errTest'));
      const r = await email.run({ address: addr.trim() });
      if (!r) return;
      setAccountId(r.result.channel_account_id);
      setCfgName(addr.trim());
      set({ channelWizard: { type: c.type, step: 3 } });
      return;
    }
    // Zalo: tạo tài khoản + chờ quét QR; quét xong hook tự sang bước 3 (tên hiển thị lấy từ backend nếu không đặt).
    setCfgName(label.trim());
    await zalo.begin(label.trim());
  };

  const finish = async () => {
    if (!accountId) return;
    if (
      await updateSettings.run({
        channel_account_id: accountId,
        patch: { name: cfgName.trim() || undefined, agent_id: agentId || undefined, ai_mode: aiMode, assign_mode: assignMode },
      })
    )
      close();
  };

  const next = step === 2 ? () => void toStep3() : step === 3 ? () => void finish() : undefined;
  const nextDisabled = step === 2 && c?.type === 'email' && !tested;

  return (
    <div className={styles.veil} onClick={close} data-testid="st-ch-wizard">
      <div role="dialog" aria-modal="true" className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.headRow}>
            {c ? (
              <span className={styles.logo} style={{ background: c.color }}>
                {c.short}
              </span>
            ) : null}
            <div className={styles.headGrow}>
              <div className={styles.eyebrow}>{t('title')}</div>
              <div className={styles.headTitle}>{c ? t('titleAcc', { n: c.name }) : t('pickChannel')}</div>
            </div>
            <button type="button" onClick={close} aria-label={t('close')} className={styles.x}>
              <Icon name="ic-x" size={16} color={color.text4} />
            </button>
          </div>
          <div className={styles.steps}>
            {stepLabels.map((l, i) => {
              const n = i + 1;
              const done = n < step;
              const on = n === step;
              return (
                <div key={l} className={styles.step}>
                  <span className={cx(styles.dot, on && styles.dotOn, done && styles.dotDone)}>{n}</span>
                  <span className={cx(styles.lbl, (on || done) && styles.lblOn)}>{l}</span>
                  {n < 3 ? <span className={styles.line} /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.body}>
          {step === 1 ? (
            <div className={styles.pickGrid}>
              {channels
                .filter((x) => PICKABLE.includes(x.type) || !x.available)
                .map((x) => (
                  <button key={x.type} type="button" disabled={!x.available} onClick={() => pickChannel(x.type)} data-testid={`st-ch-wizard-pick-${x.type}`} className={styles.pickItem}>
                    <span className={styles.pickLogo} style={{ background: x.color }}>
                      {x.short}
                    </span>
                    <span className={styles.pickName}>{x.name}</span>
                  </button>
                ))}
            </div>
          ) : step === 2 && c?.type === 'zalo_personal' ? (
            <ZaloQrStep label={label} onLabel={setLabel} qr={zalo.qr} status={zalo.status} failed={zalo.failed} />
          ) : step === 2 && c?.type === 'email' ? (
            <div className={styles.form}>
              <div>
                <div className={s.label}>{t('address')}</div>
                <input className={s.input} value={addr} type="email" onChange={(e) => setAddr(e.target.value)} placeholder={t('addressPh')} data-testid="st-ch-wizard-email" />
              </div>
              <div>
                <div className={s.label}>{t('imapHost')}</div>
                <input className={s.input} value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder={t('imapHostPh')} data-testid="st-ch-wizard-imap" />
              </div>
              <div className={styles.testRow}>
                <button type="button" className={s.ghost} onClick={() => void runTest()} data-testid="st-ch-wizard-test">
                  {t('test')}
                </button>
                {tested ? (
                  <span className={styles.testOk}>
                    <Icon name="ic-check" size={14} color={color.brand} />
                    {t('tested')}
                  </span>
                ) : null}
              </div>
            </div>
          ) : step === 3 ? (
            <div className={styles.form}>
              <div>
                <div className={s.label}>{t('cfgName')}</div>
                <input className={s.input} value={cfgName} onChange={(e) => setCfgName(e.target.value)} placeholder={t('cfgNamePh')} data-testid="st-ch-wizard-cfg-name" />
              </div>
              <div>
                <div className={s.label}>{t('agent')}</div>
                <select className={s.select} value={agentId} onChange={(e) => setAgentId(e.target.value)} data-testid="st-ch-wizard-cfg-agent">
                  <option value="">—</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className={s.label}>{t('aiMode')}</div>
                <div className={styles.seg}>
                  {MODES.map((m) => (
                    <button key={m} type="button" className={cx(styles.segBtn, aiMode === m && styles.segOn)} onClick={() => setAiMode(m)} data-testid={`st-ch-wizard-mode-${m}`}>
                      {t(`mode.${m}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={s.label}>{t('assignMode')}</div>
                <select className={s.select} value={assignMode} onChange={(e) => setAssignMode(e.target.value as ChannelAssignMode)} data-testid="st-ch-wizard-cfg-assign">
                  {ASSIGNS.map((a) => (
                    <option key={a} value={a}>
                      {t(`assign.${a}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.hint}>{t('cfgHint')}</div>
            </div>
          ) : null}
        </div>

        <div className={styles.foot}>
          {step > 1 && step < 3 ? (
            <button type="button" className={s.ghost} onClick={back}>
              {t('back')}
            </button>
          ) : null}
          <span className={styles.grow} />
          <button type="button" className={s.ghost} onClick={close}>
            {t('cancel')}
          </button>
          {step > 1 && next ? (
            <button
              type="button"
              className={s.primary}
              onClick={next}
              disabled={nextDisabled || (step === 2 && c?.type === 'zalo_personal' && zalo.busy) || email.isPending || updateSettings.isPending}
              data-testid="st-ch-wizard-next"
            >
              {step === 3 ? t('finish') : t('next')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
