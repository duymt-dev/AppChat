// Khung xương cây GenUI đang dựng (TIP-023c 6a, `ui_skeleton`): chỉ hình khối theo loại — không chữ, không số, không nút / form bấm được.
// Bị thay bằng cây thật (`ui`) khi server kiểm xong toàn cây; cây bị từ chối thì khung xương biến mất cùng bong bóng đang gõ.
'use client';
import { Skeleton } from 'antd';
import { useTranslations } from 'next-intl';
import { useGenUiStyles } from './genui.styles';

/** Cao khung biểu đồ / QR khi đang dựng — bằng chiều cao biểu đồ gọn (ChartBlock). */
const MEDIA_H = 160;

export interface SkeletonNode {
  type: string;
  children?: SkeletonNode[];
}

const CONTAINER = new Set(['stack', 'row', 'section']);

function Node({ n }: { n: SkeletonNode }) {
  const { styles } = useGenUiStyles();
  if (CONTAINER.has(n.type))
    return (
      <div className={n.type === 'row' ? styles.row : n.type === 'section' ? styles.section : styles.stack}>
        {(n.children ?? []).map((c, i) => (
          <Node key={i} n={c} />
        ))}
      </div>
    );
  if (n.type === 'button' || n.type === 'button_group' || n.type === 'badge') return <Skeleton.Button active size="small" />;
  if (n.type === 'table' || n.type === 'list' || n.type === 'form') return <Skeleton active title={false} paragraph={{ rows: 3 }} />;
  if (n.type === 'chart' || n.type === 'qr') return <Skeleton.Node active style={{ width: '100%', height: MEDIA_H }} />;
  return <Skeleton active title={false} paragraph={{ rows: 1 }} />;
}

export function GenUiSkeleton({ root }: { root: SkeletonNode }) {
  const t = useTranslations('common.genui');
  return (
    <div aria-busy="true" aria-label={t('loadingBlock')} data-testid="genui-skeleton" inert>
      <Node n={root} />
    </div>
  );
}
