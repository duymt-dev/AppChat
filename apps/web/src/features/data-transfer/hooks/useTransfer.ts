// Luồng nhập thủ công của TransferPanel (TIP-038b P4): tải tệp (purpose import) → transfer.plan (server đoán ánh xạ, kiểm từng dòng) →
// sửa ánh xạ / chính sách dòng (transfer.update_mapping, version mới) → transfer.commit (bulk — luôn qua hộp xác nhận có số dòng) →
// kết quả thật từ kế hoạch. Mọi ghi qua useAction; không gọi LLM. Cùng backend với Trợ lý (AC05 — cùng kiểm, cùng quyền).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { transferPlanQuery } from '../api';
import { useTransferUi } from '../transfer-store';
import type { TransferCommitResult, TransferPlanDto } from '../types';

type Mapping = Record<string, string>;

export function useTransfer() {
  const ui = useTransferUi();
  const plan = useQuery(transferPlanQuery(ui.planId));
  const mk = useAction<TransferPlanDto>('transfer.plan');
  const remap = useAction<TransferPlanDto>('transfer.update_mapping');
  const commit = useAction<TransferCommitResult>('transfer.commit');
  const cancel = useAction<{ plan_id: string; status: string }>('transfer.cancel');
  const [uploadErr, setUploadErr] = useState(false);
  const [uploading, setUploading] = useState(false);
  const p = plan.data ?? null;

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setUploadErr(false);
    setUploading(true);
    try {
      const up = await transport.upload(f, 'import');
      const r = await mk.run({ entity: ui.entity, file_id: up.file_id }, { silent: true });
      if (r) ui.setPlan(r.result.id);
    } catch {
      setUploadErr(true);
    } finally {
      setUploading(false);
    }
  };

  const update = async (patch: { mapping?: Mapping; row_policy?: TransferPlanDto['row_policy'] }) => {
    if (!p) return;
    await remap.run({ plan_id: p.id, if_version: p.version, ...patch }, { silent: true });
  };

  const setField = (field: string, column: string) => {
    if (!p) return;
    const next: Mapping = { ...p.mapping };
    // Một cột chỉ gán một trường: chọn lại cột đang dùng ở trường khác → bỏ ở trường cũ.
    for (const [k, c] of Object.entries(next)) if (c === column && k !== field) delete next[k];
    if (column) next[field] = column;
    else delete next[field];
    void update({ mapping: next });
  };

  const submit = async () => {
    if (!p) return null;
    const r = await commit.run({ plan_id: p.id, if_version: p.version });
    await plan.refetch();
    return r?.result ?? null;
  };

  const abort = async () => {
    if (p && (p.status === 'draft' || p.status === 'committing')) await cancel.run({ plan_id: p.id }, { silent: p.status === 'draft' });
    ui.close();
  };

  const busy = uploading || mk.isPending || remap.isPending || commit.isPending || cancel.isPending;
  return { ui, plan: p, loading: plan.isLoading, missing: plan.isError, uploadErr, busy, pick, setField, update, submit, abort };
}
