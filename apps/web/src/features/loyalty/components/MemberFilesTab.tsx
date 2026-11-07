// Tab Tệp của drawer thành viên — prototype L4714–4722. Danh sách tệp CỦA thành viên (`/loyalty/members/:id/files`, có file_id); mở tệp
// tải bytes qua route loyalty đã kiểm scope; tải lên = transport.upload (purpose attachment) rồi `loyalty.attach_file` — toast "Đã thực
// hiện" của useAction chỉ sau khi server ghi thành công; lỗi tải lên / mạng / quyền hiện thông báo lỗi.
'use client';
import { useRef } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useDrawerStyles } from '../styles/drawer.styles';
import { useLadderStyles } from '../styles/ladder.styles';
import { memberFilesQuery } from '../api';
import type { Member } from '../types';

const EXT: Record<string, string> = { pdf: color.dangerStrong, jpg: color.purple, jpeg: color.purple, png: color.purple };

export function FilesTab({ m }: { m: Member }) {
  const t = useTranslations('loyalty.dr');
  const { message } = App.useApp();
  const { styles } = useDrawerStyles();
  const l = useLadderStyles().styles;
  const canEdit = useCan('crm.edit');
  const files = useQuery(memberFilesQuery(m.contact_id));
  const attach = useAction('loyalty.attach_file');
  const input = useRef<HTMLInputElement>(null);

  const open = async (id: string, name: string) => {
    try {
      const url = URL.createObjectURL(await transport.blob(`/loyalty/members/${m.contact_id}/files/${id}`));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      void message.error(t('openFail'));
    }
  };

  const upload = async (f: File) => {
    try {
      const up = await transport.upload(f, 'attachment');
      await attach.run({ contact_id: m.contact_id, file_id: up.file_id });
    } catch {
      void message.error(t('uploadFail'));
    }
  };

  const rows = files.data ?? [];
  return (
    <div className={styles.card} data-testid="ly-files">
      <div className={styles.eyebrowRow}>
        <span className={styles.eyebrow}>{t('files')}</span>
      </div>
      {files.isError ? <div className={styles.text}>{t('filesFail')}</div> : null}
      {files.isSuccess && !rows.length ? <div className={styles.text}>{t('noFiles')}</div> : null}
      {rows.map((f) => (
        <div key={f.file_id} className={l.file} data-file={f.file_id}>
          <span className={l.ext} style={{ background: EXT[f.ext] ?? color.text3 }}>
            {f.ext.toUpperCase()}
          </span>
          <div className={styles.grow}>
            <div className={styles.histT}>{f.name}</div>
            <div className={styles.histS}>{f.at}</div>
          </div>
          <button type="button" className={l.open} onClick={() => void open(f.file_id, f.name)}>
            {t('openFile')}
          </button>
        </div>
      ))}
      {canEdit ? (
        <>
          <input
            ref={input}
            type="file"
            hidden
            aria-label={t('upload')}
            data-testid="ly-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void upload(f);
            }}
          />
          <button type="button" className={l.upload} disabled={attach.isPending} onClick={() => input.current?.click()} data-testid="ly-file-upload">
            {t('upload')}
          </button>
        </>
      ) : null}
    </div>
  );
}
