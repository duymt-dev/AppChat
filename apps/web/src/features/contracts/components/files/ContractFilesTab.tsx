// Tab "Tệp" của drawer hợp đồng (prototype L5468 — khung tệp + nút "Tải lên"; TIP-030b spec 18): tệp thật của hợp đồng theo vai trò
// (nguồn gốc / bản chưa ký / bản đã ký) — "Mở" tải bytes thật bằng phiên đăng nhập (đúng tên + loại tệp). "Tải lên" gắn tệp nguồn ký,
// chỉ khi hợp đồng còn nháp (đã ký → phụ lục). Chưa có tệp → tệp minh hoạ của meta (CCCD, phụ lục…) như prototype.
'use client';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useContractTabStyles } from '../../styles/tabs.styles';
import { useSourceStyles } from '../../styles/source.styles';
import { SOURCE_ACCEPT } from '../../hooks/useContractSource';
import { useContractFiles } from '../../hooks/useContractFiles';
import type { Contract, ContractsMeta } from '../../types';

const EXT_BG: Record<string, string> = { pdf: color.dangerStrong, docx: color.blue, xlsx: color.okGreen, jpg: color.violet, png: color.violet };
const kb = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function ContractFilesTab({ c, meta }: { c: Contract; meta: ContractsMeta }) {
  const t = useTranslations('contracts.detail');
  const fmt = useFmt();
  const { styles, cx } = useContractTabStyles();
  const { styles: s } = useSourceStyles();
  const canDraft = useCan('contract.draft');
  const x = useContractFiles(c);
  const input = useRef<HTMLInputElement>(null);
  const by = (b: string) => (b === 'esign' || b === 'customer' ? t(`fileBy.${b}`) : b || t('fileBy.esign'));
  const box = (key: string, ext: string, name: string, metaText: string, role: string | null, open: (() => void) | null) => (
    <div key={key} className={styles.file} data-testid="ct-file">
      <div className={styles.ext} style={{ background: EXT_BG[ext] ?? color.text3 }}>
        {ext.toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.fName}>
          {name}
          {role ? <span className={s.role}>{t(`fileRole.${role}` as never)}</span> : null}
        </div>
        <div className={styles.fMeta}>{metaText}</div>
      </div>
      {open ? (
        <button type="button" className={styles.open} onClick={open} data-testid="ct-file-open">
          {t('open')}
        </button>
      ) : null}
    </div>
  );
  return (
    <div className={cx(styles.card, styles.flush)} data-testid="ct-files">
      <div className={cx(styles.h, styles.hFiles)}>{t('files')}</div>
      {x.files.length
        ? x.files.map((f) => box(f.id, f.ext, f.name, t('fileMetaSize', { by: by(f.by), at: fmt.date(f.at).slice(0, 5), size: kb(f.size) }), f.role, () => void x.download(f)))
        : meta.files.map((f) => box(f.name, f.ext, f.name, f.size ? t('fileMetaSize', { by: by(f.by), at: fmt.date(f.at).slice(0, 5), size: f.size }) : t('fileMeta', { by: by(f.by), at: fmt.date(f.at).slice(0, 5) }), null, null))}
      {canDraft && x.canAttach ? (
        <>
          <input
            ref={input}
            type="file"
            accept={SOURCE_ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void x.upload(f);
              e.target.value = '';
            }}
            data-testid="ct-file-input"
          />
          <button type="button" className={styles.upload} disabled={x.busy} onClick={() => input.current?.click()} data-testid="ct-file-upload">
            {x.busy ? t('uploading') : t('upload')}
          </button>
        </>
      ) : null}
    </div>
  );
}
