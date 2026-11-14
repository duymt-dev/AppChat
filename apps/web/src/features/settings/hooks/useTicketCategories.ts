// Từ điển gợi ý danh mục ticket (TIP-034b §3.2): nháp có thứ tự (thêm / sửa / xoá / đổi chỗ — nhãn đầu là mặc định), kiểm tại chỗ bằng
// validator dùng chung, lưu MỘT lần bằng `ticket_categories.replace` kèm `if_version` (xem trước trước / sau ở hộp xác nhận). Version đổi
// (người khác lưu) → 409 STALE_VERSION: GIỮ nháp, đánh dấu xung đột, nạp lại bản server để người dùng chọn giữ nháp (lưu lên version mới)
// hoặc bỏ nháp. Nháp rỗng là lỗi kiểm, không tự trả về mặc định. Trợ lý `prefill:ticket_categories` điền nháp (không ghi): bộ nhận chỉ
// đăng ký khi màn đang mở + đã có cấu hình của workspace hiện tại — chưa mở thì bus trả "không có handler" (không báo đã điền giả).
// Còn nháp chưa lưu: hỏi trước khi rời mục (liên kết trong app / đóng tab) và trước khi bỏ nháp.
'use client';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { categoryFieldErrors, diffCategoryLabels, isValidCategoryConfig, validateCategoryLabels, type TicketCategoryConfig } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { ticketCategoriesQuery } from '../category-api';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import type { UiCommand } from '@appchat/actions';

type Draft = { labels: string[]; base: number };
const HOST = '[data-testid="st-ticket-categories"]';

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Chặn rời mục khi có nháp: liên kết ngoài khung mục (bắt ở capture, trước Link của Next) + beforeunload. */
function useLeaveGuard(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || a.closest(HOST) || window.confirm(message)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, message]);
}

export function useTicketCategories() {
  const t = useTranslations('settings.ticketCategories');
  const q = useQuery(ticketCategoriesQuery());
  const save = useAction<{ version: number }>('ticket_categories.replace');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [conflict, setConflict] = useState(false);
  const cfg: TicketCategoryConfig | undefined = q.data;
  // Nháp từ Trợ lý — chỉ điền (chuỗi thuần, tối đa 100 ô), người dùng tự xem trước và lưu.
  const version = cfg?.version;
  const receive = useCallback(
    (cmd: UiCommand) => {
      if (cmd.type !== 'prefill' || version === undefined || !Array.isArray(cmd.values.labels)) return;
      setDraft({ labels: cmd.values.labels.filter((x): x is string => typeof x === 'string').slice(0, 200), base: version });
    },
    [version],
  );
  useUiCommand(version === undefined ? 'prefill:ticket_categories:loading' : 'prefill:ticket_categories', receive);

  const labels = draft?.labels ?? cfg?.labels ?? [];
  const v = validateCategoryLabels(labels);
  const errors = categoryFieldErrors(v);
  const dirty = !!draft && !!cfg && !same(draft.labels, cfg.labels);
  useLeaveGuard(dirty, t('leave'));
  const edit = (next: string[]) => cfg && setDraft({ labels: next, base: draft?.base ?? cfg.version });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= labels.length) return;
    const next = [...labels];
    [next[i], next[j]] = [next[j]!, next[i]!];
    edit(next);
  };
  const reset = () => {
    setDraft(null);
    setConflict(false);
  };
  const discard = () => {
    if (!dirty || window.confirm(t('leave'))) reset();
  };
  const submit = async () => {
    if (!cfg || !dirty || !isValidCategoryConfig(v)) return;
    // Giữ nháp sau xung đột → lưu lên version server mới nhất người dùng đã thấy.
    const r = await save.run(
      { labels: v.labels, if_version: conflict ? cfg.version : (draft?.base ?? cfg.version) },
      {
        onError: (e) => {
          if (e.error.code !== 'STALE_VERSION') return false;
          setConflict(true);
          void q.refetch();
          return true;
        },
      },
    );
    if (r) reset();
  };
  return {
    q,
    cfg,
    labels,
    errors,
    listError: v.list ?? null,
    dirty,
    /** Thay đổi so với bản server (đổi tên = bỏ + thêm) — hiện trước khi lưu. */
    diff: dirty && cfg ? diffCategoryLabels(cfg.labels, v.labels.filter(Boolean)) : null,
    conflict,
    saving: save.isPending,
    valid: isValidCategoryConfig(v),
    set: (i: number, s: string) => edit(labels.map((x, k) => (k === i ? s : x))),
    add: () => edit([...labels, '']),
    remove: (i: number) => edit(labels.filter((_, k) => k !== i)),
    move,
    discard,
    submit,
  };
}

export type TicketCategoriesForm = ReturnType<typeof useTicketCategories>;
