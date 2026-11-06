// Menu dòng chiến dịch (Blueprint §2.2 campaign): mục hiện theo `allowed[]` server trả (trạng thái + quyền người xem) — Xem chi tiết ·
// Gửi duyệt · Duyệt & gửi / Từ chối · Tạm dừng · Tiếp tục · Huỷ · Xoá. Mọi lệnh gửi kèm `if_version` (lệch → 409, không ghi đè).
'use client';
import { useTranslations } from 'next-intl';
import { ActionMenu, color, type ActionMenuItem } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useMarketingUi } from '../marketing-store';
import type { Campaign } from '../types';

type Key = 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'cancel' | 'delete';
const LOOK: [Key, ActionMenuItem['icon'], string, Partial<ActionMenuItem>][] = [
  ['submit', 'ic-send', color.info, {}],
  ['approve', 'ic-check', color.okStrong, { divider: true }],
  ['reject', 'ic-x', color.amberText, {}],
  ['pause', 'ic-clock', color.amberGold, {}],
  ['resume', 'ic-play', color.okStrong, {}],
  ['cancel', 'ic-x', color.text3, { divider: true }],
  ['delete', 'ic-trash', color.dangerStrong, { danger: true }],
];

export function RowMenu({ c }: { c: Campaign }) {
  const t = useTranslations('marketing');
  const ui = useMarketingUi();
  const run: Record<Key, ReturnType<typeof useAction>> = {
    submit: useAction('campaign.submit'),
    approve: useAction('campaign.approve'),
    reject: useAction('campaign.reject'),
    pause: useAction('campaign.pause'),
    resume: useAction('campaign.resume'),
    cancel: useAction('campaign.cancel'),
    delete: useAction('campaign.delete'),
  };
  const input = (k: Key) => ({ campaign_id: c.id, ...(k === 'reject' ? { reason: t('rejectReason') } : {}), if_version: c.version });
  const items: ActionMenuItem[] = [
    { key: 'view', label: t('menu.view'), icon: 'ic-eye', iconColor: color.sky, onClick: () => ui.set({ menuFor: null, detail: c.id, tab: 'recipients' }) },
    ...LOOK.filter(([k]) => c.allowed.includes(`campaign.${k}`)).map(([k, icon, iconColor, extra]) => ({
      key: k,
      label: t(`menu.${k}`),
      icon,
      iconColor,
      onClick: () => (ui.set({ menuFor: null }), void run[k].run(input(k))),
      ...extra,
    })),
  ];
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ActionMenu
        open={ui.menuFor === c.id}
        onToggle={() => ui.set({ menuFor: ui.menuFor === c.id ? null : c.id })}
        onClose={() => ui.set({ menuFor: null })}
        label={t('menu.open')}
        variant="ghost"
        items={items}
        testId={`mk-menu-${c.id}`}
      />
    </div>
  );
}
