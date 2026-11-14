// Link tham gia nhóm (TIP-025b §A.6): chỉ báo bật / tắt; "Sao chép" là cử chỉ người dùng → group.copy_link (lệnh đọc qua worker, không
// bao giờ bật link) → thăm dò lệnh → có URL thì ghi clipboard (báo thành công / thất bại), link tắt → báo tắt. URL không nằm trong DOM,
// không lưu state lâu hơn lần sao chép. Không quyền / kênh không hỗ trợ → nút tắt kèm lý do.
'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import type { GroupStateDto } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useGroupStyles } from '../styles/group.styles';
import { groupCommandQuery } from '../group-api';

export function GroupLinkRow({ convId, state, onManage }: { convId: string; state?: GroupStateDto; onManage: () => void }) {
  const t = useTranslations('inbox.group');
  const { styles } = useGroupStyles();
  const { message: toast } = App.useApp();
  const copy = useAction<{ command_id: string; status: 'queued' }>('group.copy_link');
  const [commandId, setCommandId] = useState<string | null>(null);
  const command = useQuery(groupCommandQuery(commandId)).data ?? null;
  const handled = useRef<string | null>(null);
  const enabled = state?.provider?.link_enabled;
  const canCopy = !!state?.can_manage && !!state.supports.link;
  const reason = !state ? 'linkUnknown' : !state.can_manage ? 'linkNoPerm' : !state.supports.link ? 'linkUnsupported' : null;
  const busy = copy.isPending || (!!commandId && (!command || command.state === 'pending'));

  useEffect(() => {
    if (!command || command.state === 'pending' || handled.current === command.id) return;
    handled.current = command.id;
    setCommandId(null);
    const url = command.link?.url;
    if (command.state !== 'confirmed') toast.error(t('linkFailed'));
    else if (!command.link?.enabled) toast.info(t('linkOff'));
    else if (!url || !navigator.clipboard) toast.error(t('linkCopyFailed'));
    else navigator.clipboard.writeText(url).then(() => toast.success(t('linkCopied')), () => toast.error(t('linkCopyFailed')));
  }, [command, t, toast]);

  const onCopy = async () => {
    const r = await copy.run({ conversation_id: convId });
    if (r) setCommandId(r.result.command_id);
  };

  return (
    <div className={styles.row} data-testid="group-link">
      <Icon name="ic-link" size={18} color={color.groupInk} />
      <button type="button" className={styles.linkMain} onClick={() => state?.can_manage && onManage()} disabled={!state?.can_manage}>
        <div className={styles.label}>{t('joinLink')}</div>
        <div className={styles.sub}>{t(enabled == null ? 'linkUnknown' : enabled ? 'linkOn' : 'linkOff')}</div>
      </button>
      <button type="button" className={styles.copyBtn} onClick={() => void onCopy()} disabled={!canCopy || busy} title={reason ? t(reason) : undefined} data-testid="group-link-copy">
        {t(busy ? 'linkCopying' : 'linkCopy')}
      </button>
    </div>
  );
}
