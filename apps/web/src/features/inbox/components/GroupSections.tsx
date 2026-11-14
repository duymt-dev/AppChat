// Phần dưới của "Thông tin nhóm": Bảng tin (GroupBoard — đọc thật theo trang, TIP-025b §A.7) · AI trong nhóm · ẩn / xoá lịch sử / rời nhóm — prototype L1941–2008.
'use client';
import { useState } from 'react';
import type { GroupStateDto } from '@appchat/shared';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useGroupStyles } from '../styles/group.styles';
import { GroupBoard } from './GroupBoard';
import { GroupFold as Fold } from './GroupFold';
import type { Conversation, GroupInfo } from '../types';

const POLICIES = ['mention', 'auto', 'off'] as const;

export interface GroupSectionsProps {
  conv: Conversation;
  g: GroupInfo;
  /** TIP-025b: trạng thái nhóm (chính sách + phiên bản); chưa tải → chỉ hiện chính sách cũ, không cho đổi. */
  state?: GroupStateDto;
  onPolicy: (p: (typeof POLICIES)[number], version: number) => Promise<boolean>;
}

export function GroupSections({ conv, g, state, onPolicy }: GroupSectionsProps) {
  const t = useTranslations('inbox.group');
  const { styles, cx } = useGroupStyles();
  const clear = useAction('conversation.clear_history');
  const hide = useAction('conversation.hide');
  const [aiOpen, setAiOpen] = useState(false);
  // Chính sách lưu thật (TIP-025b §A.2): đọc từ trạng thái nhóm, ghi qua group.set_ai_policy (CAS) — không giữ state cục bộ.
  const policy = state?.policy ?? g.ai_policy;

  return (
    <>
      <GroupBoard convId={conv.id} />
      <Fold title={t('ai.title')} open={aiOpen} onToggle={() => setAiOpen((v) => !v)}>
        <div className={styles.seg} role="radiogroup" data-testid="group-ai">
          {POLICIES.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={policy === k} className={cx(styles.segBtn, policy === k && styles.segOn)} disabled={!state || policy === k} onClick={() => state && void onPolicy(k, state.policy_version)} data-testid={`group-ai-${k}`}>
              {t(`ai.${k}`)}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <Icon name="ic-shield" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('ai.rules')}</div>
            <div className={styles.sub}>{t('ai.rulesSub')}</div>
          </div>
        </div>
      </Fold>
      <div className={styles.gap} />
      <div className={styles.block}>
        <button type="button" className={styles.row} onClick={() => void hide.run({ conversation_id: conv.id, hidden: true })}>
          <Icon name="ic-eye" size={18} color={color.groupInk} />
          <span className={styles.label}>{t('hide')}</span>
        </button>
        <button type="button" className={styles.row} onClick={() => void clear.run({ conversation_id: conv.id })}>
          <Icon name="ic-trash" size={18} color={color.danger} />
          <span className={cx(styles.label, styles.danger)}>{t('clear')}</span>
        </button>
      </div>
    </>
  );
}
