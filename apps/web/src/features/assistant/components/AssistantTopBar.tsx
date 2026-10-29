// Thanh trên Trợ lý — prototype L1180–1190: icon + "Trợ lý AI" + badge AppChat, breadcrumb theo màn con, nút "Cuộc trò chuyện mới".
'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAssistantStyles } from '../styles/assistant.styles';

export interface AssistantTopBarProps {
  crumb?: 'actions' | 'cowork' | 'approvals';
  onNewChat?: () => void;
  right?: ReactNode;
}

export function AssistantTopBar({ crumb, onNewChat, right }: AssistantTopBarProps) {
  const t = useTranslations('assistant');
  const { styles } = useAssistantStyles();
  return (
    <div className={styles.top}>
      <span className={styles.topMark}>
        <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
      </span>
      <span className={styles.topTitle}>{t('title')}</span>
      <span className={styles.brand}>{t('brand')}</span>
      {crumb ? <span className={styles.crumb}>{t(`crumb.${crumb}`)}</span> : null}
      <span className={styles.grow} />
      {right}
      {onNewChat ? (
        <button type="button" className={styles.newChat} onClick={onNewChat} data-testid="asst-new-chat">
          <Icon name="ic-refresh" size={14} color={color.text3} />
          {t('newChat')}
        </button>
      ) : null}
    </div>
  );
}
