// Hộp liên kết / quản lý kênh (manifest — omnichannel-adapter): Zalo cá nhân quét QR (channel.zalo.start_login), Email nhập hộp thư
// (channel.email.connect), Website mở cấu hình widget. Kênh đã kết nối: Kết nối lại / Ngắt kết nối (channel.reconnect / disconnect).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelsStyles } from '../styles/channels.styles';
import { useSettingsUi } from '../settings-store';
import { channelsQuery } from '../api';
import { FormModal } from './FormModal';

const WIDGET = '/settings/web_widget';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ConnectChannelModal() {
  const t = useTranslations('settings.channels.modal');
  const { message } = App.useApp();
  const router = useRouter();
  const s = useSectionStyles().styles;
  const { styles } = useChannelsStyles();
  const type = useSettingsUi((x) => x.channelModal);
  const set = useSettingsUi((x) => x.set);
  const c = useQuery({ ...channelsQuery('all'), enabled: !!type }).data?.find((x) => x.type === type);
  const zalo = useAction('channel.zalo.start_login');
  const email = useAction('channel.email.connect');
  const reconnect = useAction('channel.reconnect');
  const disconnect = useAction('channel.disconnect');
  const [addr, setAddr] = useState('');
  const [label, setLabel] = useState('');
  if (!type || !c) return null;
  const close = () => set({ channelModal: null });
  const save = async () => {
    if (c.connected) {
      if (await reconnect.run({ channel_id: c.type })) close();
      return;
    }
    if (c.type === 'webchat') {
      close();
      router.push(WIDGET);
      return;
    }
    if (c.type === 'email') {
      if (!EMAIL.test(addr.trim())) return void message.error(t('errEmail'));
      if (await email.run({ address: addr.trim() })) close();
      return;
    }
    if (await zalo.run(label.trim() ? { label: label.trim() } : {})) close();
  };
  const saveLabel = c.connected ? t('reconnect') : c.type === 'webchat' ? t('openWidget') : c.type === 'email' ? t('connect') : t('scanned');
  return (
    <FormModal
      open
      title={t(c.connected ? 'manageTitle' : 'title', { n: c.name })}
      onClose={close}
      onSave={() => void save()}
      saveLabel={saveLabel}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={zalo.isPending || email.isPending || reconnect.isPending}
      testId="st-ch-modal"
    >
      {c.connected ? (
        <>
          <div className={styles.mInfo}>
            <span className={styles.lIc} style={{ background: c.color }}>
              {c.short}
            </span>
            <div className={styles.grow}>
              <div className={styles.lName}>{c.account}</div>
              <div className={styles.lAcc}>{t('stats', { n: c.convs.toLocaleString('vi-VN'), f: c.frt })}</div>
            </div>
          </div>
          <button
            type="button"
            className={s.dangerGhost}
            onClick={() => void disconnect.run({ channel_id: c.type }).then((r) => r && close())}
            data-testid="st-ch-disconnect"
          >
            {t('disconnect')}
          </button>
        </>
      ) : c.type === 'zalo_personal' ? (
        <>
          <div className={styles.qr} aria-label={t('qr')}>
            <Icon name="ic-grid" size={96} color={color.text} strokeWidth={1.2} />
          </div>
          <div className={s.muted}>{t('qrD')}</div>
          <div>
            <div className={s.label}>{t('label')}</div>
            <input className={s.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('labelPh')} data-testid="st-ch-label" />
          </div>
        </>
      ) : c.type === 'email' ? (
        <div>
          <div className={s.label}>{t('address')}</div>
          <input className={s.input} value={addr} type="email" onChange={(e) => setAddr(e.target.value)} placeholder={t('addressPh')} data-testid="st-ch-email" />
          <div className={s.muted}>{t('addressD')}</div>
        </div>
      ) : (
        <div className={s.muted}>{t('widgetD')}</div>
      )}
    </FormModal>
  );
}
