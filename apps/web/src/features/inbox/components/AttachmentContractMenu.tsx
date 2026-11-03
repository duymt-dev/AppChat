// Nút "Tạo hợp đồng" dưới khung tệp PDF / DOCX của tin khách gửi (TIP-030b spec 19). Chỉ hiện khi có quyền `contract.draft` và tin có
// id thật (tin mock tạm chưa lưu không có). Prototype không có — nút nhỏ theo kiểu link của bong bóng (gap-filling §2).
'use client';
import { createStyles } from 'antd-style';
import { useTranslations } from 'next-intl';
import { color, font, layout } from '@appchat/ui';
import { CONTRACT_MIME, useAttachmentContract } from '../hooks/useAttachmentContract';
import type { MessageAttachment } from '../types';

const useStyles = createStyles(({ css, responsive }) => ({
  btn: css`
    align-self: flex-start;
    border: none;
    background: transparent;
    padding: 0;
    min-height: 24px;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
  `,
}));

export function AttachmentContractMenu({ messageId, idx, file }: { messageId: string; idx: number; file: MessageAttachment }) {
  const t = useTranslations('inbox.thread');
  const { styles } = useStyles();
  const x = useAttachmentContract();
  if (!x.can || !CONTRACT_MIME.test(file.mime)) return null;
  return (
    <button type="button" className={styles.btn} disabled={x.pending} onClick={() => void x.run(messageId, idx)} data-testid="msg-file-contract">
      {x.pending ? t('contractCreating') : t('contractFromFile')}
    </button>
  );
}
