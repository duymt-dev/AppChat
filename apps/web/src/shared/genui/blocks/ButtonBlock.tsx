// Khối `button` (standard §4): `ui` → UiCommand (đổi màn / lọc / tô sáng, không đổi dữ liệu); `action` → useAction mang intent server
// ký (nguồn assistant → thẻ xem trước / xác nhận). Node action không có intent (không quyền / action không còn) → ẩn.
'use client';
import { Button } from 'antd';
import { useGenUi } from '../context';
import { TONE } from '../genui.styles';
import { useGenUiIntent } from '../hooks/useGenUiIntent';
import type { BlockOf, BlockProps } from '../types';

export function ButtonBlock({ block, path }: BlockProps<BlockOf<'button'>>) {
  if (block.on.kind === 'action') return <ActionButton block={block} path={path} />;
  return <UiButton block={block} path={path} />;
}

const toneStyle = (b: BlockOf<'button'>) => (b.tone && b.tone !== 'default' && b.tone !== 'brand' ? { color: TONE[b.tone].fg, borderColor: TONE[b.tone].fg } : undefined);

function UiButton({ block }: BlockProps<BlockOf<'button'>>) {
  const { onUi } = useGenUi();
  const on = block.on;
  return (
    <Button size="small" type={block.tone === 'brand' ? 'primary' : 'default'} style={toneStyle(block)} onClick={() => on.kind === 'ui' && onUi(on.command)} data-testid="genui-button" data-kind="ui">
      {block.label}
    </Button>
  );
}

function ActionButton({ block, path }: BlockProps<BlockOf<'button'>>) {
  const on = block.on as Extract<BlockOf<'button'>['on'], { kind: 'action' }>;
  const { run, allowed, isPending } = useGenUiIntent(on.action_id, path);
  if (!allowed) return null;
  return (
    <Button size="small" type={block.tone === 'brand' ? 'primary' : 'default'} danger={block.tone === 'danger'} loading={isPending} onClick={() => void run(on.input)} data-testid="genui-button" data-kind="action">
      {block.label}
    </Button>
  );
}
