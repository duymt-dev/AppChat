// Renderer cây giao diện do Trợ lý ghép (standards/ai/generative-ui.md — D55, TIP-023c G1.3): kiểm lại cây theo schema đóng (sai → khối
// lỗi + Thử lại, không render nửa vời), dựng từng khối từ registry; `compact` (drawer) / `full` (màn Trợ lý, modal). Phần bị cắt ở compact
// → "Mở rộng" mở GenUiModal cùng cây (không gọi LLM). Nút ui → UI Command Bus; nút / form action → intent server ký. Không có đường gọi
// API nào khác ngoài action / UiCommand / đọc ref + ảnh QR.
'use client';
import { useMemo, useState } from 'react';
import { Alert, Button } from 'antd';
import { useTranslations } from 'next-intl';
import { checkTree, type GenUiPart, type UiCommand } from '@appchat/shared';
import { refReader } from './format';
import { GenUiContext } from './context';
import { GenUiModal } from './GenUiModal';
import { useGenUiRefs } from './hooks/useGenUiRefs';
import { renderBlock } from './registry';
import type { GenUiCtx, GenUiMode } from './types';

export interface GenUiRendererProps {
  part: GenUiPart;
  mode: GenUiMode;
  onUi: (cmd: UiCommand) => void;
  onExternal?: GenUiCtx['onExternal'];
  /** Cây không hợp lệ → nút Thử lại (gửi lại lượt). */
  onRetry?: () => void;
  /** Mở lại phiên / đổi workspace → hỏi lại refs theo quyền hiện hành. */
  refreshRefs?: boolean;
  workspaceId?: string | null;
}

export function GenUiRenderer({ part, mode, onUi, onExternal, onRetry, refreshRefs, workspaceId }: GenUiRendererProps) {
  const t = useTranslations('common.genui');
  const tc = useTranslations('common');
  const [expanded, setExpanded] = useState(false);
  const check = useMemo(() => checkTree(part.tree), [part.tree]);
  const refs = useGenUiRefs(part, { workspaceId, refresh: refreshRefs });
  const ctx = useMemo<GenUiCtx>(
    () => ({
      part,
      mode,
      ref: refReader(refs),
      intent: (path) => part.intents?.[path],
      onUi,
      onExternal,
      renderBlock,
      ...(mode === 'compact' ? { onExpand: () => setExpanded(true) } : {}),
    }),
    [part, mode, refs, onUi, onExternal],
  );
  if (!check.ok)
    return (
      <Alert
        type="warning"
        showIcon
        title={t('renderFailed')}
        data-testid="genui-error"
        action={onRetry ? <Button size="small" onClick={onRetry}>{tc('retry')}</Button> : undefined}
      />
    );
  return (
    <GenUiContext.Provider value={ctx}>
      <div data-testid="genui" data-mode={mode}>
        {renderBlock(check.tree.root, '')}
      </div>
      {mode === 'compact' ? <GenUiModal open={expanded} onClose={() => setExpanded(false)} part={part} onUi={onUi} onExternal={onExternal} refs={refs} /> : null}
    </GenUiContext.Provider>
  );
}

