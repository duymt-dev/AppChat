// Form Sửa của thẻ xem trước (REQ-E03b): input của thẻ ⇄ form theo khuôn lồng nhau của backend (object → nhóm ô, array → danh sách phần tử,
// enum `a|b` → chọn, `?` = tuỳ chọn). Gửi = `POST /assistant/preview-edit` — chỉ xem trước lại (không thực thi); thẻ mới thay thẻ cũ (token
// mới). Lỗi 422 → lỗi từng ô theo đường dẫn (`items.0.qty`); lỗi khác → thông báo chung, thẻ cũ vẫn chờ.
'use client';
import { useCallback, useState } from 'react';
import { ApiRequestError } from '@appchat/shared';
import { editPreview } from '../api';
import { useAssistantUi } from '../assistant-store';
import type { ChatMessage, ConfirmEvent } from '../types';

export type Brief = string | Brief[] | { [field: string]: Brief };

/** Ô của khuôn: tên thật (bỏ `?`) + bắt buộc. */
export const fieldOf = (k: string) => ({ name: k.replace(/\?$/, ''), required: !k.endsWith('?') && k !== '…' });

/** Kiểu lá: enum (`a|b|c`) → lựa chọn; number / integer → số; boolean; còn lại chữ. */
export function leafKind(b: string): { kind: 'enum'; options: string[] } | { kind: 'number' | 'boolean' | 'text' } {
  const parts = b.split('|').filter((x) => x !== 'null');
  if (parts.length > 1 && parts.every((x) => /^[a-z0-9_]+$/.test(x) && !['string', 'number', 'integer', 'boolean'].includes(x))) return { kind: 'enum', options: parts };
  if (parts[0] === 'number' || parts[0] === 'integer') return { kind: 'number' };
  if (parts[0] === 'boolean') return { kind: 'boolean' };
  return { kind: 'text' };
}

/** Phần tử rỗng theo khuôn (thêm dòng mới vào mảng). */
export function emptyOf(b: Brief): unknown {
  if (Array.isArray(b)) return [];
  if (typeof b === 'object') return Object.fromEntries(Object.keys(b).filter((k) => k !== '…').map((k) => [fieldOf(k).name, emptyOf(b[k]!)]));
  return leafKind(b).kind === 'number' ? null : '';
}

/** Bỏ ô trống không bắt buộc trước khi gửi (server validate lại theo schema action). */
export function compact(v: unknown, b: Brief | undefined): unknown {
  if (Array.isArray(v)) return v.map((x) => compact(x, Array.isArray(b) ? b[0] : undefined));
  if (v && typeof v === 'object') {
    const shape = b && typeof b === 'object' && !Array.isArray(b) ? b : {};
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const key = Object.keys(shape).find((s) => fieldOf(s).name === k);
      const required = key ? fieldOf(key).required : true;
      if (!required && (x === '' || x === null || x === undefined)) continue;
      out[k] = compact(x, key ? shape[key] : undefined);
    }
    return out;
  }
  return v;
}

/** Đặt giá trị theo đường dẫn (`items.0.qty`) — trả bản sao. */
export function setAt(root: Record<string, unknown>, path: (string | number)[], value: unknown): Record<string, unknown> {
  const next = structuredClone(root);
  let cur: Record<string | number, unknown> = next;
  path.slice(0, -1).forEach((p, i) => {
    cur[p] ??= typeof path[i + 1] === 'number' ? [] : {};
    cur = cur[p] as Record<string | number, unknown>;
  });
  cur[path[path.length - 1]!] = value;
  return next;
}

export function useEditActionPreview(m: ChatMessage) {
  const card = m.card as ConfirmEvent;
  const [value, setValue] = useState<Record<string, unknown>>(() => structuredClone(card.input ?? {}));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = useCallback((path: (string | number)[], v: unknown) => setValue((cur) => setAt(cur, path, v)), []);

  const submit = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setErrors({});
    setFailed(null);
    try {
      const { card: next } = await editPreview(card.confirm_token, compact(value, card.schema as Brief) as Record<string, unknown>);
      useAssistantUi.getState().patchMsg(m.id, { card: next, status: 'pending' });
      return true;
    } catch (e) {
      if (e instanceof ApiRequestError && e.error.code === 'VALIDATION_FAILED' && e.error.fields) setErrors(e.error.fields as Record<string, string>);
      else setFailed(e instanceof ApiRequestError ? e.error.code : 'INTERNAL');
      return false;
    } finally {
      setBusy(false);
    }
  }, [card, m.id, value]);

  return { value, set, errors, failed, busy, submit, schema: (card.schema ?? {}) as Record<string, Brief> };
}
