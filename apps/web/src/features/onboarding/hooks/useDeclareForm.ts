// State + submit của popup khai báo (REQ-A02). MST tra qua /business-lookup (VietQR, OQ-05); ghi qua business_profile.update.
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, authKeys } from '@/features/auth';
import { useAction } from '@/shared/actions/useAction';

export type DeclareKind = 'business' | 'individual';
export type LookupState = 'idle' | 'found' | 'not_found';

export interface DeclareFields {
  name: string;
  address: string;
  representative: string;
  phone: string;
  founded_on: string;
  legal_status: string;
}

const EMPTY: DeclareFields = { name: '', address: '', representative: '', phone: '', founded_on: '', legal_status: '' };

export function useDeclareForm() {
  const qc = useQueryClient();
  const { run, isPending } = useAction('business_profile.update');
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKindRaw] = useState<DeclareKind>('business');
  const [idNumber, setIdNumber] = useState('');
  const [lookup, setLookup] = useState<LookupState>('idle');
  const [fields, setFields] = useState<DeclareFields>(EMPTY);
  const [field, setField] = useState('');
  const [looking, setLooking] = useState(false);

  const setKind = (k: DeclareKind) => {
    setKindRaw(k);
    setLookup('idle');
    setFields(EMPTY);
  };
  const set = (k: keyof DeclareFields, v: string) => setFields((f) => ({ ...f, [k]: v }));

  const doLookup = async () => {
    setLooking(true);
    try {
      const r = await authApi.taxLookup(idNumber);
      setFields({ name: r.legal_name, address: r.address, representative: r.representative, phone: r.phone, founded_on: r.founded_on, legal_status: r.legal_status });
      setLookup('found');
    } catch {
      setFields(EMPTY);
      setLookup('not_found');
    } finally {
      setLooking(false);
    }
  };

  const digits = idNumber.replace(/\D/g, '');
  const showFields = kind === 'individual' || lookup !== 'idle';
  const canNext = fields.name.trim().length > 0 && (kind === 'individual' ? digits.length === 12 : digits.length === 10 || digits.length === 13);

  const submit = async () => {
    const input = {
      kind: kind === 'individual' ? 'individual' : 'enterprise',
      ...(kind === 'individual' ? { national_id: digits } : { tax_code: digits }),
      legal_name: fields.name.trim(),
      address: fields.address.trim() || '—',
      representative: fields.representative || undefined,
      phone: fields.phone || undefined,
      founded_on: fields.founded_on || undefined,
      legal_status: fields.legal_status || undefined,
      business_description: field.trim(),
    };
    // Workspace vừa tạo lúc đăng ký có thể còn đang khởi tạo DB (503 WORKSPACE_UNAVAILABLE, thường < 10 giây) → chờ rồi gửi lại.
    for (let attempt = 0; attempt < 20; attempt++) {
      let busy = false;
      const res = await run(input, { silent: true, onError: (e) => (busy = e.error.code === 'WORKSPACE_UNAVAILABLE') });
      if (res) await qc.invalidateQueries({ queryKey: authKeys.session });
      if (!busy) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
  };

  return { step, setStep, kind, setKind, idNumber, setIdNumber, lookup, looking, doLookup, fields, set, field, setField, showFields, canNext, submit, isPending };
}
