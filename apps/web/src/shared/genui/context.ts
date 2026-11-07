// Ngữ cảnh dùng chung cho các khối GenUI (cây, refs, intent, chế độ hiển thị) — khối con đọc qua hook, không truyền prop qua từng tầng.
'use client';
import { createContext, useContext } from 'react';
import type { GenUiCtx } from './types';

export const GenUiContext = createContext<GenUiCtx | null>(null);

export function useGenUi(): GenUiCtx {
  const c = useContext(GenUiContext);
  if (!c) throw new Error('useGenUi ngoài GenUiRenderer');
  return c;
}
