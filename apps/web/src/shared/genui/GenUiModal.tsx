// "Mở rộng" (standard §9): modal ~960px dựng lại ĐÚNG cây đó ở chế độ full (đủ cột / dòng, biểu đồ lớn, form đủ ô) — không gọi LLM,
// dùng lại refs đã có. Mobile 390: ModalShell toàn màn.
'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { color, ModalShell } from '@appchat/ui';
import type { GenUiPart, UiCommand } from '@appchat/shared';
import { refReader } from './format';
import { GenUiContext } from './context';
import { renderBlock } from './registry';
import type { GenUiCtx } from './types';

/** Bề rộng modal full (standard §9: ~960px). */
const FULL_WIDTH = 960;

export interface GenUiModalProps {
  open: boolean;
  onClose: () => void;
  part: GenUiPart;
  refs: Record<string, unknown>;
  onUi: (cmd: UiCommand) => void;
  onExternal?: GenUiCtx['onExternal'];
}

export function GenUiModal({ open, onClose, part, refs, onUi, onExternal }: GenUiModalProps) {
  const t = useTranslations('common.genui');
  const tc = useTranslations('common');
  const ctx = useMemo<GenUiCtx>(
    () => ({
      part,
      mode: 'full',
      ref: refReader(refs),
      intent: (path) => part.intents?.[path],
      // Lệnh UI từ modal: đóng modal rồi đổi màn / lọc.
      onUi: (cmd) => {
        onClose();
        onUi(cmd);
      },
      onExternal,
      renderBlock,
    }),
    [part, refs, onUi, onExternal, onClose],
  );
  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} title={t('modalTitle')} icon="ic-spark" iconColor={color.brand} iconBg={color.brandBg} width={FULL_WIDTH} closeLabel={tc('close')} testId="genui-modal" stacked>
      <GenUiContext.Provider value={ctx}>
        {renderBlock(part.tree.root, '')}
      </GenUiContext.Provider>
    </ModalShell>
  );
}
