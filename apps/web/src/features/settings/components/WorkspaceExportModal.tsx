// Xuất dữ liệu workspace (TIP-041 P3, AC07) — Owner. Xuất LOGIC qua đúng các lệnh xuất của TIP-038 / 038b (mỗi danh sách một tệp, toàn bộ
// dòng Owner thấy, không bí mật / mật khẩu / audit secret) — KHÔNG đưa bản sao lưu kỹ thuật (pg_dump) cho Owner. ≤ 50 dòng tải ngay, nhiều
// hơn chạy nền rồi tải qua link có xác thực (useListExport). Khách hàng dùng `contact.export` (CSV).
'use client';
import { useTranslations } from 'next-intl';
import { WORKSPACE_EXPORT_KINDS, type DataJobDto, type ListExportKind } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useListExport } from '@/shared/actions/useListExport';
import { transport } from '@/shared/api/client';
import { useSectionStyles } from '../styles/section.styles';
import { useDangerStyles } from '../styles/danger.styles';
import { FormModal } from './FormModal';

type ContactCsv = { file_name: string; mime: string; content: string };

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

function Row({ label, busy, status, onRun, testId }: { label: string; busy: boolean; status: string | null; onRun: () => void; testId: string }) {
  const t = useTranslations('settings.general.export');
  const s = useSectionStyles();
  const { styles } = useDangerStyles();
  return (
    <div className={styles.item}>
      <span>{label}</span>
      <button type="button" className={s.cx(s.styles.ghost, s.styles.sm)} disabled={busy} onClick={onRun} data-testid={testId}>
        {status ?? t('run')}
      </button>
    </div>
  );
}

function ListRow({ kind }: { kind: ListExportKind }) {
  const t = useTranslations('settings.general.export');
  const x = useListExport(kind);
  return <Row label={t(`kind.${kind.split('.')[0]}` as never)} busy={x.busy} status={x.label} onRun={() => void x.start({})} testId={`st-export-${kind.split('.')[0]}`} />;
}

function ContactRow() {
  const t = useTranslations('settings.general.export');
  const run = useAction<ContactCsv>('contact.export');
  const start = async () => {
    let job: string | null = null;
    const r = await run.run({}, { onAccepted: (a) => a.status === 'job_accepted' && (job = a.job_id) });
    if (r) return save(new Blob([r.result.content], { type: r.result.mime }), r.result.file_name);
    // Việc nền: thông báo xong việc đến qua chuông; nếu đã xong ngay thì tải luôn.
    if (job) {
      const j = await transport.get<DataJobDto>(`/data-jobs/${job}`);
      if (j.status === 'completed' && j.download_url) save(await transport.blob(j.download_url.replace(/^\/v1/, '')), j.file_name ?? 'khach-hang.csv');
    }
  };
  return <Row label={t('kind.contact')} busy={run.isPending} status={null} onRun={() => void start()} testId="st-export-contact" />;
}

export function WorkspaceExportModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('settings.general.export');
  const s = useSectionStyles().styles;
  const { styles } = useDangerStyles();
  return (
    <FormModal open wide title={t('title')} onClose={onClose} onSave={onClose} saveLabel={t('done')} cancelLabel={t('close')} closeLabel={t('close')} testId="st-export-modal">
      <div className={s.muted}>{t('hint')}</div>
      <div className={styles.grid}>
        <ContactRow />
        {WORKSPACE_EXPORT_KINDS.map((k) => (
          <ListRow key={k} kind={k} />
        ))}
      </div>
      <div className={s.muted}>{t('note')}</div>
    </FormModal>
  );
}
