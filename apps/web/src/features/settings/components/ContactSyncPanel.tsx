// Danh bạ tài khoản Zalo (TIP-014b D3) trong khối "Đồng bộ dữ liệu" của drawer quản lý kênh: "Lấy danh bạ" → tiến trình / một phần / lỗi →
// danh sách người (tối đa 100 dòng / trang) với trạng thái khớp khách. Chọn tay dòng có SĐT chưa có khách → "Nhập N khách" (contact.import,
// cần quyền crm.import, xác nhận như nhập file). Dòng thiếu SĐT hiện rõ, không nhập được; SĐT thuộc khách khác → "Đã có ở khách khác"
// (không lộ là ai). Không tự nhập, không gửi lời mời / tin. Ảnh chụp hết hạn sau 24 giờ.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelManageStyles } from '../styles/channel-manage.styles';
import { useContactSync } from '../hooks/useContactSync';
import { syncRunning } from '../channel-sync-types';

const useStyles = createStyles(({ css }) => ({
  list: css`
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r8}px;
    margin-top: 8px;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    & + & {
      border-top: 1px solid ${color.divider};
    }
  `,
  name: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  state: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  warn: css`
    color: ${color.amberText};
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
  `,
}));

export function ContactSyncPanel({ accountId }: { accountId: string }) {
  const t = useTranslations('settings.channels.drawer.contacts');
  const s = useSectionStyles().styles;
  const m = useChannelManageStyles().styles;
  const { styles, cx } = useStyles();
  const c = useContactSync(accountId);
  const sync = c.sync;
  const done = sync && !syncRunning(sync.state);

  return (
    <div data-testid="st-ch-contacts">
      <div className={m.syncRow}>
        <div className={m.acctBody}>
          <div className={m.syncLbl}>{t('title')}</div>
          <div className={m.syncD}>{t('desc')}</div>
        </div>
        <button type="button" className={s.ghost} onClick={c.run} disabled={c.loading} data-testid="st-ch-contacts-run">
          {c.loading ? t('running') : t('run')}
        </button>
      </div>
      {sync ? (
        <div className={styles.meta} data-testid="st-ch-contacts-state" data-state={sync.state}>
          {t(`state.${sync.state}` as 'state.complete', { n: sync.received })}
          {sync.error ? ` · ${sync.error}` : ''}
        </div>
      ) : null}
      {done && sync.rows.length ? (
        <>
          <div className={styles.list}>
            {sync.rows.map((r) => (
              <label key={r.external_id} className={styles.row} data-testid="st-ch-contacts-row" data-state={r.state}>
                <input type="checkbox" disabled={!c.importable(r)} checked={c.picked.has(r.external_id)} onChange={() => c.toggle(r.external_id)} />
                <span className={styles.name}>{r.name}</span>
                <span className={cx(styles.state, (r.state === 'no_phone' || r.state === 'conflict') && styles.warn)}>{r.phone && r.state !== 'conflict' ? `${r.phone} · ` : ''}{t(`row.${r.state}` as never)}</span>
              </label>
            ))}
          </div>
          <div className={m.syncRow}>
            <div className={cx(m.syncD, m.syncGrow)}>{c.canImport ? t('importHint') : t('importDenied')}</div>
            <button type="button" className={s.primary} disabled={!c.picked.size || c.importing} onClick={() => void c.importPicked()} data-testid="st-ch-contacts-import">
              {t('import', { n: c.picked.size })}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
