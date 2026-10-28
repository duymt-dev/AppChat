// UI Command Bus (Blueprint §7.3): module đăng ký handler prefill / open / filter / highlight; Trợ lý phát lệnh vào đây.
'use client';
import { useEffect } from 'react';
import type { UiCommand } from '@appchat/actions';

type Handler = (cmd: UiCommand) => void;
const handlers = new Map<string, Handler>();

const keyOf = (cmd: UiCommand): string => {
  switch (cmd.type) {
    case 'prefill':
      return `prefill:${cmd.form}`;
    case 'open':
      return `open:${cmd.entity}`;
    case 'filter':
      return `filter:${cmd.table}`;
    case 'highlight':
      return 'highlight';
    case 'navigate':
      return 'navigate';
  }
};

export const registerUiCommand = (key: string, handler: Handler) => {
  handlers.set(key, handler);
  return () => {
    if (handlers.get(key) === handler) handlers.delete(key);
  };
};

/** Trả false khi không có handler — caller chuyển thành navigate tới route mặc định của entity. */
export const dispatchUiCommand = (cmd: UiCommand): boolean => {
  const h = handlers.get(keyOf(cmd));
  if (!h) return false;
  h(cmd);
  return true;
};

export function useUiCommand(key: string, handler: Handler) {
  useEffect(() => registerUiCommand(key, handler), [key, handler]);
}
