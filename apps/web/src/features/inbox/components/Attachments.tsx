// Tệp / ảnh của một tin (TIP-025, API thật — `Message.attachments`): ảnh → thu nhỏ (bấm mở link ký ở tab mới), tệp khác → khung tệp
// (tên + dung lượng) như prototype L1784 (`file`). Link ký mở được không cần đăng nhập (tải xuống / xem trực tiếp với ảnh).
'use client';
import { createStyles } from 'antd-style';
import { Icon, color, radius } from '@appchat/ui';
import { useBubbleStyles } from '../styles/bubble.styles';
import type { MessageAttachment } from '../types';
import { AttachmentContractMenu } from './AttachmentContractMenu';

const useStyles = createStyles(({ css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  thumb: css`
    display: block;
    max-width: 240px;
    max-height: 240px;
    border-radius: ${radius.r10}px;
    object-fit: cover;
    background: ${color.bg};
  `,
  link: css`
    color: inherit;
    text-decoration: none;
  `,
}));

const IMAGE = /^image\//;

const sizeOf = (n: number | undefined) => (n === undefined ? '' : n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** `messageId`: tin khách gửi đã lưu — tệp PDF / DOCX có thêm "Tạo hợp đồng" (TIP-030b). */
export function Attachments({ files, messageId }: { files: MessageAttachment[]; messageId?: string }) {
  const { styles } = useStyles();
  const { styles: b, cx } = useBubbleStyles();
  return (
    <div className={styles.list} data-testid="msg-attachments">
      {files.map((f, i) =>
        IMAGE.test(f.mime) ? (
          <a key={i} href={f.url} target="_blank" rel="noreferrer" className={styles.link}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ảnh của khách / link ký từ API, không qua next/image */}
            <img src={f.url} alt={f.name ?? ''} className={styles.thumb} data-testid="msg-image" />
          </a>
        ) : (
          <div key={i} className={styles.list}>
            <a href={f.url} target="_blank" rel="noreferrer" className={cx(styles.link, b.file)} data-testid="msg-file">
              <div className={b.fileIcon}>
                <Icon name="ic-doc" size={17} color={color.dangerStrong} />
              </div>
              <div>
                <div className={b.fileName}>{f.name ?? f.url}</div>
                <div className={b.fileMeta}>{sizeOf(f.size)}</div>
              </div>
            </a>
            {messageId ? <AttachmentContractMenu messageId={messageId} idx={i} file={f} /> : null}
          </div>
        ),
      )}
    </div>
  );
}
