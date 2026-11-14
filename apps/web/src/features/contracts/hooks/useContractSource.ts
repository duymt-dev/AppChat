// Nguồn nội dung hợp đồng (TIP-030b spec 18): "Từ mẫu" (mẫu theo loại) hoặc "Tải file lên" (PDF / DOCX) — tải lên `purpose document`
// rồi `contract.inspect_file` đề xuất giá trị (người dùng xác nhận từng ô). Lỗi tải / kiểm hiển thị rõ, không giả là đã lưu; thử lại giữ
// nguyên dữ liệu đã nhập.
'use client';
import { useRef, useState } from 'react';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import type { Inspection } from '../types';

export type SourceKind = 'template' | 'file';
export type SourcePhase = 'idle' | 'uploading' | 'inspecting' | 'ready' | 'error';

/** Tối đa của guard server (PDF 25MB — DOCX 10MB kiểm lại ở server theo bytes thật). */
export const SOURCE_MAX_BYTES = 25 * 1024 * 1024;
export const SOURCE_ACCEPT = 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx';

export function useContractSource() {
  const [kind, setKind] = useState<SourceKind>('template');
  const [phase, setPhase] = useState<SourcePhase>('idle');
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState('');
  const inspect = useAction<Inspection>('contract.inspect_file');
  const abort = useRef<AbortController | null>(null);
  const last = useRef<File | null>(null);

  const pick = async (f: File) => {
    last.current = f;
    setKind('file');
    setError('');
    setInspection(null);
    if (f.size > SOURCE_MAX_BYTES) {
      setPhase('error');
      return setError('too_large');
    }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setPhase('uploading');
    try {
      const up = await transport.upload(f, 'document', ac.signal);
      setFile({ id: up.file_id, name: up.name });
      setPhase('inspecting');
      let reason = 'failed';
      const r = await inspect.run(
        { file_id: up.file_id },
        {
          silent: true,
          // Lý do từ chối của guard (`file: macro` / `unsupported_type` …) hiện ngay trên bước nguồn, không toast chung.
          onError: (e) => ((reason = e.error.fields?.file ?? e.error.fields?.file_id ?? e.error.fields?.render ?? 'failed'), true),
        },
      );
      if (!r) {
        setPhase('error');
        return setError(reason);
      }
      setInspection(r.result);
      setPhase('ready');
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setPhase('error');
      setError('upload_failed');
    }
  };

  const retry = () => (last.current ? pick(last.current) : undefined);
  const reset = () => {
    abort.current?.abort();
    setFile(null);
    setInspection(null);
    setError('');
    setPhase('idle');
  };

  /** Ô `source` của contract.create — nguồn tệp chỉ khi đã kiểm xong. */
  const source = kind === 'file' && file && phase === 'ready' ? { type: 'file' as const, file_id: file.id } : undefined;
  return { kind, setKind: (k: SourceKind) => (setKind(k), k === 'template' && reset()), phase, file, inspection, error, pick, retry, reset, source, blocked: kind === 'file' && phase !== 'ready' };
}
