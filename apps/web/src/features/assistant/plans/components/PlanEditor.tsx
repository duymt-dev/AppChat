// Sửa kế hoạch đang dừng (TIP-023d §3.4, §6.1): chỉ bước CHƯA chạy được đổi tiêu đề / bỏ / đổi chỗ; bước đã chạy / đang chờ khoá. "Lưu" gửi
// một lần plan_update (revision mới, kế hoạch vẫn dừng) — "Tiếp tục" là nút riêng ở PlanCard. Không có nút hoàn tác việc đã làm.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { Icon } from '@appchat/ui';
import { usePlanStyles } from '../plan.styles';
import { EDITABLE_STEP, type Plan } from '../types';
import type { PlanOp } from '../hooks/usePlan';
import { PlanStep } from './PlanStep';

export function PlanEditor({ plan, busy, onSave, onClose }: { plan: Plan; busy: boolean; onSave: (ops: PlanOp[]) => Promise<unknown>; onClose: () => void }) {
  const t = useTranslations('assistant.plan');
  const { styles } = usePlanStyles();
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState(plan.steps.map((s) => s.id));
  const byId = new Map(plan.steps.map((s) => [s.id, s]));
  const editable = (id: string) => EDITABLE_STEP.has(byId.get(id)!.state);

  const move = (i: number, d: -1 | 1) => setOrder((o) => {
    const n = [...o];
    [n[i], n[i + d]] = [n[i + d]!, n[i]!];
    return n;
  });
  const ops = (): PlanOp[] => {
    const out: PlanOp[] = [];
    for (const [id, title] of Object.entries(titles)) if (!removed.has(id) && title.trim() && title.trim() !== byId.get(id)!.title) out.push({ op: 'update', step_id: id, patch: { title: title.trim() } });
    for (const id of removed) out.push({ op: 'remove', step_id: id });
    const kept = order.filter((id) => !removed.has(id));
    const base = plan.steps.map((s) => s.id).filter((id) => !removed.has(id));
    kept.forEach((id, i) => {
      if (base[i] !== id && editable(id)) out.push({ op: 'move', step_id: id, after_step_id: i === 0 ? null : kept[i - 1]! });
    });
    return out;
  };

  return (
    <div data-testid="plan-editor" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <ul className={styles.steps}>
        {order.filter((id) => !removed.has(id)).map((id, i, arr) => {
          const s = byId.get(id)!;
          const open = editable(id);
          return open ? (
            <li key={id} className={styles.step} data-testid="plan-edit-step">
              <span className={styles.pos}>{i + 1}</span>
              {/* IP-7.2: focus ô đầu tiên sửa được khi mở; Esc đóng (không lưu). */}
              <input autoFocus={id === order.find((x) => !removed.has(x) && editable(x))} className={styles.input} aria-label={t('stepTitle')} value={titles[id] ?? s.title} maxLength={200} onChange={(e) => setTitles((x) => ({ ...x, [id]: e.target.value }))} />
              <button type="button" className={styles.iconBtn} aria-label={t('up')} disabled={i === 0 || !editable(arr[i - 1]!)} onClick={() => move(order.indexOf(id), -1)}>
                <Icon name="ic-up" size={14} />
              </button>
              <button type="button" className={styles.iconBtn} aria-label={t('down')} disabled={i === arr.length - 1} onClick={() => move(order.indexOf(id), 1)}>
                <Icon name="ic-down" size={14} />
              </button>
              <button type="button" className={styles.iconBtn} aria-label={t('remove')} onClick={() => setRemoved((r) => new Set(r).add(id))}>
                <Icon name="ic-x" size={14} />
              </button>
            </li>
          ) : (
            <PlanStep key={id} step={s} />
          );
        })}
      </ul>
      <div className={styles.note}>{t('lockedNote')}</div>
      <div className={styles.actions}>
        <Button type="primary" loading={busy} data-testid="plan-save" onClick={async () => (await onSave(ops()), onClose())}>
          {t('save')}
        </Button>
        <Button onClick={onClose}>{t('close')}</Button>
      </div>
    </div>
  );
}
