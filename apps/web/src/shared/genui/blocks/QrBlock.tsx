// Khối `qr` (DC-227): trạng thái đăng nhập Zalo theo attempt (waiting / scanned / connected / expired / failed), ảnh QR ephemeral của
// đúng attempt. Hết hạn / thất bại → "Tạo mã mới" = `channel.reconnect` cùng tài khoản (quyền channels.manage, nút hệ thống — không do
// model đề nghị). Ref không còn (mất quyền) → "Không có dữ liệu".
'use client';
import { Button, Spin } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '../../actions/useAction';
import { useCan } from '../../authz/useCan';
import { useGenUi } from '../context';
import { TONE, useGenUiStyles } from '../genui.styles';
import { qrSeed, useQrAttempt } from '../hooks/useQrAttempt';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { NoData } from './NoData';

export function QrBlock({ block, path }: BlockProps<BlockOf<'qr'>>) {
  const { ref } = useGenUi();
  const v = ref(block.login);
  const seed = qrSeed(v);
  if (isUnavailable(v) || !seed.accountId || !seed.login) return <NoData />;
  return <QrLive block={block} path={path} seed={seed} />;
}

function QrLive({ block, path, seed }: BlockProps<BlockOf<'qr'>> & { seed: ReturnType<typeof qrSeed> }) {
  const t = useTranslations('common.genui.qr');
  const { styles } = useGenUiStyles();
  const { part, onExternal } = useGenUi();
  const canManage = useCan('channels.manage');
  const reconnect = useAction('channel.reconnect');
  const q = useQrAttempt(seed, { runId: part.run_id, node: path, onConnected: () => onExternal?.({ node: path, status: 'connected' }) });
  const st = q.login?.status ?? 'waiting';
  const msg = st === 'failed' && q.login?.reason === 'declined' ? t('declined') : t(st);
  const tone = st === 'connected' ? TONE.success.fg : st === 'failed' || st === 'expired' ? TONE.danger.fg : TONE.default.fg;
  const regenerate = async () => {
    if (!q.accountId) return;
    const r = await reconnect.run({ channel_account_id: q.accountId }, { silent: true });
    if (r) q.restart();
  };
  return (
    <div className={styles.qr} data-testid="genui-qr" data-status={st}>
      <div className={styles.sectionTitle}>{block.title ?? t('title')}</div>
      {st === 'waiting' ? (
        q.png ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh QR data URI tạm thời của attempt hiện hành
          <img className={styles.qrImg} src={`data:image/png;base64,${q.png}`} alt={t('alt')} data-testid="genui-qr-img" />
        ) : (
          <Spin />
        )
      ) : null}
      <div className={styles.qrStatus} style={{ color: tone }} data-testid="genui-qr-status">
        {msg}
      </div>
      {(st === 'expired' || st === 'failed') && canManage ? (
        <Button size="small" loading={reconnect.isPending} onClick={() => void regenerate()} data-testid="genui-qr-regenerate">
          {t('regenerate')}
        </Button>
      ) : null}
    </div>
  );
}
