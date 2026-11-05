// Cảnh báo gán tài khoản kênh (TIP-022b E) — đọc agent đang gán THẬT của từng tài khoản (không suy từ loại kênh đã chọn). Xuất bản agent
// không đổi gán; đổi gán làm ở Cài đặt › Kênh (channel.update_settings, cần channels.manage, kiểm phiên bản gán → 409 khi bị đổi giữa chừng).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { bindingPreviewQuery } from '../../api';
import { useBuilderStyles } from '../../styles/builder.styles';

export function BindingPreview({ agentId, types }: { agentId?: string; types: string[] }) {
  const t = useTranslations('agents.b.binding');
  const { styles: bs } = useBuilderStyles();
  const canSee = useCan('channels.manage');
  const q = useQuery({ ...bindingPreviewQuery(types), enabled: canSee && types.length > 0 });
  if (!canSee || !types.length) return null;
  if (q.isError) return <div className={bs.help}>{t('error')}</div>;
  const taken = (q.data?.accounts ?? []).filter((a) => a.current_agent_id && a.current_agent_id !== agentId);
  if (!taken.length) return null;
  return (
    <div className={bs.help} role="note" data-testid="agb-binding-warning">
      {t('taken', { n: taken.length })}
      <ul>
        {taken.map((a) => (
          <li key={a.channel_account_id} data-account={a.channel_account_id}>
            {t('row', { account: a.name, agent: a.current_agent || t('unknown') })}
          </li>
        ))}
      </ul>
      {t('hint')}
    </div>
  );
}
