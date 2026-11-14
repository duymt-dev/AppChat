// Danh mục khối ĐÓNG (standard §2): type → component. Thêm khối mới = sửa schema + registry + renderer + test; type lạ không có ở đây
// (schema đã chặn) → renderer bỏ qua, không bao giờ dựng HTML tuỳ ý. Khối bố cục dựng con qua `renderBlock` của context (không import ngược).
import { createElement, type ComponentType } from 'react';
import type { UiBlock, UiBlockType } from '@appchat/shared';
import { AppointmentOrderBlock } from './blocks/AppointmentOrderBlock';
import { BadgeBlock } from './blocks/BadgeBlock';
import { ButtonBlock } from './blocks/ButtonBlock';
import { ButtonGroupBlock } from './blocks/ButtonGroupBlock';
import { ChartBlock } from './blocks/ChartBlock';
import { FormBlock } from './blocks/FormBlock';
import { ListBlock } from './blocks/ListBlock';
import { ProgressBlock } from './blocks/ProgressBlock';
import { QrBlock } from './blocks/QrBlock';
import { RowBlock } from './blocks/RowBlock';
import { SectionBlock } from './blocks/SectionBlock';
import { StackBlock } from './blocks/StackBlock';
import { StatBlock } from './blocks/StatBlock';
import { StatGroupBlock } from './blocks/StatGroupBlock';
import { TableBlock } from './blocks/TableBlock';
import { TextBlock } from './blocks/TextBlock';
import type { BlockOf, BlockProps } from './types';

type Registry = { [K in UiBlockType]: ComponentType<BlockProps<BlockOf<K>>> };

export const BLOCKS: Registry = {
  stack: StackBlock,
  row: RowBlock,
  section: SectionBlock,
  text: TextBlock,
  stat: StatBlock,
  stat_group: StatGroupBlock,
  table: TableBlock,
  list: ListBlock,
  progress: ProgressBlock,
  badge: BadgeBlock,
  chart: ChartBlock,
  button: ButtonBlock,
  button_group: ButtonGroupBlock,
  form: FormBlock,
  qr: QrBlock,
  // TIP-033c: thẻ gợi ý tạo đơn từ lịch hẹn — dữ liệu đọc lại theo quyền hiện hành, không lấy từ cây.
  appointment_order: AppointmentOrderBlock,
};

/** Dựng một khối theo registry (khối bố cục gọi lại qua `ctx.renderBlock`). */
export function renderBlock(block: UiBlock, path: string) {
  const C = BLOCKS[block.type] as ComponentType<BlockProps> | undefined;
  return C ? createElement(C, { key: path, block, path }) : null;
}
