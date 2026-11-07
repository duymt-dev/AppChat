// Trình sửa rule chia lead (TIP-042b): nháp gắn với rule + version đang sửa; lưu `lead_routing.update` (tạo — không rule_id; sửa — CAS
// if_version). 409 STALE_VERSION → báo + tải lại, giữ nháp để người dùng lưu lại; 409 CONFLICT (rule đã có) → tải lại.
'use client';
import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSettingsUi } from '../settings-store';
import { leadRoutingQuery } from '../api/lead-routing';
import type { RoutingDraft } from '../routing.types';

export function useLeadRouting() {
  const t = useTranslations('settings.routing');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const q = useQuery(leadRoutingQuery());
  const d = useSettingsUi((x) => x.routingEditor);
  const set = useSettingsUi((x) => x.set);
  const save = useAction('lead_routing.update');
  const close = () => set({ routingEditor: null });
  const patch = (p: Partial<RoutingDraft>) => d && set({ routingEditor: { ...d, ...p } });
  const auto = !!d && d.mode !== 'manual';
  const poolSize = d ? (d.mode === 'by_channel' ? 1 : d.pool === 'team' ? (d.teamId ? 1 : 0) : d.userIds.length) : 0;
  const valid = !!d && (!d.enabled || !auto || (d.mode === 'by_channel' ? !!d.fixedUserId : poolSize > 0));
  const submit = async () => {
    if (!d) return;
    if (!valid) return void message.error(t('errPool'));
    const pool = d.mode === 'manual' ? {} : d.mode === 'by_channel' ? { user_ids: d.fixedUserId ? [d.fixedUserId] : [], fixed_user_id: d.fixedUserId } : d.pool === 'team' ? { team_id: d.teamId } : { user_ids: d.userIds, team_id: null };
    const input = { ...(d.ruleId ? { rule_id: d.ruleId, if_version: d.version } : { channel_account_id: d.accountId }), enabled: d.enabled, mode: d.mode, ...pool };
    const r = await save.run(input, {
      onError: (e) => {
        if (e.error.code !== 'STALE_VERSION' && e.error.code !== 'CONFLICT') return false;
        void message.error(t('stale'));
        void qc.invalidateQueries({ queryKey: ['lead_routing'] });
        return true;
      },
    });
    if (r) close();
  };
  return { q, d, patch, close, submit, valid, pending: save.isPending };
}
