// State form tạo hợp đồng (crmSpec.contracts L8407 · COMMERCE §9 trường): kiểm bắt buộc, ngày kết thúc sau ngày bắt đầu, map sang input contract.create.
'use client';
import { useState } from 'react';
import type { ContractKind } from '../types';

export interface ContractDraft {
  number: string;
  contact_id: string;
  quote_id: string;
  signed_date: string;
  start_date: string;
  end_date: string;
  value: string;
  kind: ContractKind;
  owner_user_id: string;
  title: string;
  file_name: string;
  note: string;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function initialContractDraft(today: string, prefill?: Record<string, unknown> | null): ContractDraft {
  const p = prefill ?? {};
  return {
    number: str(p.number),
    contact_id: str(p.contact_id),
    quote_id: str(p.quote_id),
    signed_date: str(p.signed_date) || today,
    start_date: str(p.start_date),
    end_date: str(p.end_date),
    value: digits(p.value),
    kind: (['service', 'sale', 'framework'] as const).includes(p.kind as ContractKind)
      ? (p.kind as ContractKind)
      : 'service',
    owner_user_id: str(p.owner_user_id),
    title: str(p.title),
    file_name: str(p.file_name),
    note: str(p.note),
  };
}

export type MissingField = 'contact' | 'signed' | 'value';

export function useContractForm(init: ContractDraft) {
  const [d, setD] = useState(init);
  const set = <K extends keyof ContractDraft>(k: K, v: ContractDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const missing: MissingField[] = [
    ...(d.contact_id ? [] : (['contact'] as const)),
    ...(d.signed_date ? [] : (['signed'] as const)),
    ...(Number(d.value) > 0 ? [] : (['value'] as const)),
  ];
  const badRange = !!d.start_date && !!d.end_date && d.end_date <= d.start_date;
  const input = {
    contact_id: d.contact_id,
    kind: d.kind,
    value: d.value,
    signed_date: d.signed_date,
    ...(d.quote_id ? { quote_id: d.quote_id } : {}),
    ...(d.number.trim() ? { number: d.number.trim() } : {}),
    ...(d.title.trim() ? { title: d.title.trim() } : {}),
    ...(d.start_date ? { start_date: d.start_date } : {}),
    ...(d.end_date ? { end_date: d.end_date } : {}),
    ...(d.owner_user_id ? { owner_user_id: d.owner_user_id } : {}),
    ...(d.file_name ? { file_name: d.file_name } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  };
  return { d, set, money: digits, missing, badRange, input };
}
