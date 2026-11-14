// Thanh chọn nhiều — prototype L4878–4888: "Đã chọn n ticket" · Gán người phụ trách ▾ · AI xử lý · Đổi ưu tiên ▾ · ✕ (ticket.bulk_update).
// Orchestrator (TIP-034c §4.1): gửi / theo dõi / hoàn tác qua useTicketBulk, kết quả từng id ở TicketBulkResults (hiện cả khi đã bỏ chọn).
'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useTicketsStyles } from '../styles/tickets.styles';
import { useBulkStyles } from '../styles/bulk.styles';
import { useTicketsUi } from '../tickets-store';
import { PRIORITIES } from '../status';
import { useTicketBulk } from '../hooks/useTicketBulk';
import { TicketBulkResults } from './TicketBulkResults';
import type { BulkPatch } from '../bulk-types';
import type { TicketsMeta } from '../types';

const CARET = '▾';

function Pick({
  label,
  icon,
  tone,
  open,
  onToggle,
  testId,
  children,
}: {
  label: string;
  icon: IconName;
  tone: string;
  open: boolean;
  onToggle: () => void;
  testId: string;
  children: ReactNode;
}) {
  const { styles } = useTicketsStyles();
  const b = useBulkStyles().styles;
  return (
    <div className={b.wrap}>
      <button
        type="button"
        className={styles.bulkBtn}
        onClick={onToggle}
        aria-expanded={open}
        data-testid={testId}
      >
        <Icon name={icon} size={14} color={tone} />
        {`${label} ${CARET}`}
      </button>
      {open ? (
        <>
          <div className={b.veil} onClick={onToggle} />
          <div className={b.menu} role="menu">
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function BulkBar({ meta }: { meta: TicketsMeta }) {
  const t = useTranslations('tickets');
  const { styles } = useTicketsStyles();
  const b = useBulkStyles().styles;
  const ui = useTicketsUi();
  const bulk = useTicketBulk();
  const [menu, setMenu] = useState<'assign' | 'priority' | null>(null);
  const results = bulk.op ? (
    <TicketBulkResults
      op={bulk.op}
      result={bulk.result}
      undoResult={bulk.undoResult}
      codeOf={bulk.codeOf}
      pending={bulk.pending}
      onUndo={() => void bulk.undo()}
      onCancel={() => void bulk.cancel()}
      onRetry={() => void bulk.retry()}
      onDownload={() => void bulk.download()}
      onClose={bulk.dismiss}
    />
  ) : null;
  // Thao tác trước còn chạy nền → chưa nhận thao tác mới (tập chọn đã chốt, không áp chồng).
  if (!ui.selected.length || bulk.busy) return results;
  const run = async (patch: BulkPatch) => {
    setMenu(null);
    ui.set({ selected: [] });
    await bulk.apply(patch);
  };
  const toggle = (k: 'assign' | 'priority') => () => setMenu(menu === k ? null : k);
  return (
    <>
      {results}
      <div className={styles.bulk} data-testid="tk-bulk">
        <span className={styles.bulkN}>
          <Icon name="ic-check" size={14} color={color.brandInk} strokeWidth={2.4} />
          {t('bulk.selected', { n: ui.selected.length })}
        </span>
        <span className={styles.grow} />
        <Pick
          label={t('bulk.assign')}
          icon="ic-users"
          tone={color.periwinkle}
          open={menu === 'assign'}
          onToggle={toggle('assign')}
          testId="tk-bulk-assign"
        >
          {meta.members.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              className={b.item}
              onClick={() => void run({ assignee_user_id: m.id })}
            >
              {m.name}
            </button>
          ))}
        </Pick>
        {meta.agent.id ? (
          <button
            type="button"
            className={styles.bulkAi}
            onClick={() => void run({ assignee_agent_id: meta.agent.id })}
            data-testid="tk-bulk-ai"
          >
            <Icon name="ic-spark" size={14} color={color.white} />
            {t('bulk.ai')}
          </button>
        ) : null}
        <Pick
          label={t('bulk.priority')}
          icon="ic-bell"
          tone={color.text3}
          open={menu === 'priority'}
          onToggle={toggle('priority')}
          testId="tk-bulk-priority"
        >
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              role="menuitem"
              className={b.item}
              onClick={() => void run({ priority: p })}
            >
              {t(`priority.${p}`)}
            </button>
          ))}
        </Pick>
        <button
          type="button"
          className={styles.bulkX}
          onClick={() => ui.set({ selected: [] })}
          aria-label={t('bulk.clear')}
          title={t('bulk.clear')}
        >
          <Icon name="ic-x" size={16} color={color.text3} />
        </button>
      </div>
    </>
  );
}
