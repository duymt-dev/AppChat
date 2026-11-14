// Khối `chart` (standard §2, §8): dữ liệu từ `$ref` (≤ 24 điểm, giá trị y phải là số), thư viện biểu đồ tải lazy (chỉ khi cây có chart).
// Compact: biểu đồ nhỏ; full: lớn. Không có dữ liệu → "Không có dữ liệu".
'use client';
import { lazy, Suspense } from 'react';
import { Skeleton } from 'antd';
import { GENUI_LIMITS } from '@appchat/shared';
import { useGenUi } from '../context';
import { rowsOf } from '../format';
import { useGenUiStyles } from '../genui.styles';
import { isUnavailable, type BlockOf, type BlockProps } from '../types';
import { NoData } from './NoData';

const ChartView = lazy(() => import('./ChartView'));

/** Chiều cao biểu đồ theo khung (drawer nhỏ / modal + màn Trợ lý lớn). */
const HEIGHT = { compact: 160, full: 280 } as const;

export function ChartBlock({ block }: BlockProps<BlockOf<'chart'>>) {
  const { styles } = useGenUiStyles();
  const { ref, mode } = useGenUi();
  const v = ref(block.data);
  const data = rowsOf(v)
    .slice(0, GENUI_LIMITS.chartPoints)
    .map((r) => ({ [block.x]: String(r[block.x] ?? ''), [block.y]: Number(r[block.y]) }))
    .filter((r) => Number.isFinite(r[block.y]));
  return (
    <div data-testid="genui-chart" data-kind={block.kind} data-points={data.length}>
      {block.title ? <div className={styles.chartTitle}>{block.title}</div> : null}
      {isUnavailable(v) || !data.length ? (
        <NoData />
      ) : (
        <Suspense fallback={<Skeleton.Node active style={{ width: '100%', height: HEIGHT[mode] }} />}>
          <ChartView kind={block.kind} data={data} x={block.x} y={block.y} height={HEIGHT[mode]} />
        </Suspense>
      )}
    </div>
  );
}
