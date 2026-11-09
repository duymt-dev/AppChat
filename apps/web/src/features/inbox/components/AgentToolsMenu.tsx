// Menu ＋ của ô soạn (REQ-C11, D51): Thêm tệp · Chụp màn hình · quyền của agent phụ trách hội thoại (chỉ xem — nhóm theo module + Kỹ
// năng AI, badge Cần kết nối / Sắp có; không công tắc) · Research "Sắp có" · link sang Builder. Nguồn: GET /conversations/:id/agent-tools.
// TIP-019c §4.1: khối "Kỹ năng AI cho bạn" — người dùng tự chạy (quyền của chính họ), tách hẳn danh sách quyền của agent.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon, color } from '@appchat/ui';
import { getAction } from '@appchat/actions';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import { UtilityMenu, type UtilityActionId } from '@/shared/ai-utilities';
import { agentToolsQuery } from '../api';

export function AgentToolsMenu({ conversationId, onClose, onPickFile, onCapture, onSelectUtility }: { conversationId: string; onClose: () => void; onPickFile: () => void; onCapture: () => void; onSelectUtility: (id: UtilityActionId) => void }) {
  const t = useTranslations('inbox.composer');
  const tc = useTranslations('common');
  const tAll = useTranslations();
  const router = useRouter();
  const { styles, cx } = useComposerStyles();
  const { styles: ps } = usePopStyles();
  const data = useQuery(agentToolsQuery(conversationId)).data;
  const groups = (data?.groups ?? []).filter((g) => g.key !== 'skill');
  const skill = data?.groups.find((g) => g.key === 'skill');
  const title = (id: string) => tAll((getAction(id)?.title ?? id) as never);

  return (
    <div className={cx(ps.pop, ps.popNarrow)} data-testid="attach-pop">
      <div className={ps.popBody}>
        <button type="button" className={cx(ps.slot)} onClick={() => (onClose(), onPickFile())} data-testid="attach-file">
          <Icon name="ic-doc" size={15} color={color.text3} />
          <span className={styles.grow}>{t('attachMenu.file')}</span>
        </button>
        <button type="button" className={cx(ps.slot)} onClick={() => (onClose(), onCapture())} data-testid="attach-screenshot">
          <Icon name="ic-image" size={15} color={color.text3} />
          <span className={styles.grow}>{t('attachMenu.screenshot')}</span>
        </button>
        <UtilityMenu title={t('attachMenu.humanSkills')} onSelect={onSelectUtility} />
        <div className={ps.popHint}>{t('attachMenu.agentTools')}</div>
        {groups.map((g) => (
          <div key={g.key} className={ps.slot} style={{ cursor: 'default' }}>
            <span className={styles.grow}>
              <div className={ps.qrTitle}>
                {tc(`modules.${g.key}` as never)} <span className={ps.popHint}>{t('attachMenu.count', { on: g.granted, total: g.total })}</span>
              </div>
              <div className={ps.qrPreview}>{g.tools.map((a) => (a.badge ? `${title(a.id)} (${t(`attachMenu.${a.badge}` as never)})` : title(a.id))).join(' · ')}</div>
            </span>
          </div>
        ))}
        {skill ? (
          <div className={ps.slot} style={{ cursor: 'default' }} data-testid="attach-skill-group">
            <span className={styles.grow}>
              <div className={ps.qrTitle}>{t('attachMenu.skillGroup')}</div>
              <div className={ps.qrPreview}>{skill.tools.map((a) => `/${a.id} — ${title(a.id)}`).join(' · ')}</div>
            </span>
          </div>
        ) : null}
        {!groups.length && !skill ? <div className={ps.popHint}>{t('attachMenu.noTools')}</div> : null}
        <button type="button" className={ps.slot} disabled>
          <Icon name="ic-globe" size={15} color={color.text4} />
          <span className={styles.grow}>{t('attachMenu.research')}</span>
          <span className={styles.conf}>{t('attachMenu.soon')}</span>
        </button>
        <button type="button" className={cx(ps.slot, ps.builderLink)} onClick={() => router.push(`/agents/${data?.agent?.id ?? ''}`)}>
          <Icon name="ic-arrow" size={13} color={color.brandInk} />
          <span className={styles.grow}>{t('attachMenu.editInBuilder')}</span>
        </button>
      </div>
    </div>
  );
}
