// Bạn bè Zalo (TIP-014b E — DC nới DC-247) trong khối "Đồng bộ dữ liệu" của drawer quản lý kênh, dưới Danh bạ: lời mời tới → Nhận /
// Từ chối (inbox.reply); tra MỘT SĐT (inbox.manage, trần 30 / ngày, kết quả tạm 24 giờ) → "Gửi lời mời" (xác nhận cảnh báo rủi ro, trần 20
// / ngày) / "Thu hồi" / "Lưu thành khách" (contact.create — chỉ khi bấm). Trạng thái lệnh gần nhất hiện ngay dưới (đang gửi / xong / lỗi /
// chưa rõ). Không hàng loạt, không AI.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { useChannelFriends } from '../hooks/useChannelFriends';

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 4px;
  `,
  warn: css`
    color: ${color.amberText};
  `,
}));

export function FriendsPanel({ accountId }: { accountId: string }) {
  const t = useTranslations('settings.channels.drawer.friends');
  const s = useSectionStyles().styles;
  const m = useChannelManageStyles().styles;
  const { styles, cx } = useStyles();
  const f = useChannelFriends(accountId);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  if (!f.canReply && !f.canManage) return null;
  const l = f.lookup;
  const st = f.friend;

  const send = (ext: string) => {
    if (window.confirm(t('sendConfirm'))) f.op('send', ext, message.trim());
  };

  return (
    <div data-testid="st-ch-friends">
      <div className={m.syncLbl}>{t('title')}</div>
      <div className={m.syncD}>{t('desc')}</div>
      {f.canReply ? (
        f.incoming.length ? (
          f.incoming.map((r) => (
            <div key={r.external_id} className={styles.row} data-testid="st-ch-friend-req">
              <div className={m.acctBody}>
                <div className={m.acctNameT}>{r.name}</div>
                {r.incoming_message ? <div className={m.syncD}>{r.incoming_message}</div> : null}
              </div>
              <button type="button" className={s.ghost} disabled={f.busy} onClick={() => f.op('reject', r.external_id)} data-testid="st-ch-friend-reject">
                {t('reject')}
              </button>
              <button type="button" className={s.primary} disabled={f.busy} onClick={() => f.op('accept', r.external_id)} data-testid="st-ch-friend-accept">
                {t('accept')}
              </button>
            </div>
          ))
        ) : (
          <div className={styles.meta}>{t('noRequests')}</div>
        )
      ) : null}
      {f.canManage ? (
        <>
          <div className={styles.row}>
            <input className={s.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phonePh')} inputMode="tel" maxLength={20} data-testid="st-ch-lookup-phone" />
            <button type="button" className={s.ghost} disabled={!phone.trim() || f.finding} onClick={() => f.find(phone.trim())} data-testid="st-ch-lookup-run">
              {f.finding ? t('finding') : t('find')}
            </button>
          </div>
          <div className={styles.meta}>{t('lookupHint')}</div>
          {l && l.state !== 'queued' && l.state !== 'running' ? (
            <div data-testid="st-ch-lookup-result" data-state={l.state}>
              {l.state === 'found' ? (
                <>
                  <div className={styles.row}>
                    <div className={cx(m.acctBody, m.acctNameT)}>{t('found', { name: l.name ?? l.phone, phone: l.phone })}</div>
                    {f.canSave ? (
                      <button type="button" className={s.ghost} disabled={f.saving || f.saved} onClick={() => void f.save()} data-testid="st-ch-lookup-save">
                        {f.saved ? t('saved') : t('save')}
                      </button>
                    ) : null}
                  </div>
                  {st?.state === 'outgoing' ? (
                    <div className={styles.row}>
                      <div className={cx(m.syncD, m.syncGrow)}>{t('requested')}</div>
                      <button type="button" className={s.ghost} disabled={f.busy} onClick={() => f.op('undo', l.external_id!)} data-testid="st-ch-friend-undo">
                        {t('undo')}
                      </button>
                    </div>
                  ) : st?.state === 'friend' ? (
                    <div className={styles.meta}>{t('isFriend')}</div>
                  ) : (
                    <div className={styles.row}>
                      <input className={s.input} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('messagePh')} maxLength={150} data-testid="st-ch-friend-message" />
                      <button type="button" className={s.primary} disabled={f.busy || st?.op_status === 'queued'} onClick={() => send(l.external_id!)} data-testid="st-ch-friend-send">
                        {t('send')}
                      </button>
                    </div>
                  )}
                  <div className={cx(styles.meta, styles.warn)}>{t('risk')}</div>
                </>
              ) : (
                <div className={cx(styles.meta, styles.warn)}>{t(`lookup.${l.state}` as 'lookup.not_found')}</div>
              )}
            </div>
          ) : null}
        </>
      ) : null}
      {st?.op && st.op_status ? (
        <div className={cx(styles.meta, st.op_status !== 'confirmed' && st.op_status !== 'queued' && styles.warn)} data-testid="st-ch-friend-status" data-status={st.op_status}>
          {t(`op.${st.op_status}` as 'op.confirmed', { name: st.name })}
        </div>
      ) : null}
    </div>
  );
}
