// Biểu đồ thật (@ant-design/charts — D55, tải lazy từ ChartBlock): column | line | funnel; màu token brand.
'use client';
import { Column, Funnel, Line } from '@ant-design/charts';
import { color } from '@appchat/ui';

export interface ChartViewProps {
  kind: 'column' | 'line' | 'funnel';
  data: Record<string, unknown>[];
  x: string;
  y: string;
  height: number;
}

export default function ChartView({ kind, data, x, y, height }: ChartViewProps) {
  const base = { data, xField: x, yField: y, height, autoFit: true, axis: { x: { labelAutoRotate: false } } };
  if (kind === 'line') return <Line {...base} style={{ stroke: color.brand, lineWidth: 2 }} />;
  if (kind === 'funnel') return <Funnel {...base} style={{ fill: color.brand }} />;
  return <Column {...base} style={{ fill: color.brand }} />;
}
