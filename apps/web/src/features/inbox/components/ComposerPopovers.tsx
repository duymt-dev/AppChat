// Popover của ô soạn: Trả lời nhanh · Đặt lịch hẹn (khung giờ trống thật — SchedulingPopover, TIP-025b §E) · Dịch tự động · menu ＋ (REQ-C11 — AgentToolsMenu) — prototype L1801–1868, L653.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import { cannedQuery } from '../api';
import type { Conversation } from '../types';
import { AgentToolsMenu } from './AgentToolsMenu';
import { SchedulingPopover } from './SchedulingPopover';
import { TranslationPopover } from './TranslationPopover';
import type { XlPref } from '../hooks/useInboxTranslation';

export interface ComposerPopoversProps {
  conv: Conversation;
  customer: string;
  xl: XlPref;
  onXl: (p: Partial<XlPref>) => void;
  onInsert: (text: string) => void;
  onPickFile: () => void;
  onCapture: () => void;
}

export function ComposerPopovers({ conv, customer, xl, onXl, onInsert, onPickFile, onCapture }: ComposerPopoversProps) {
  const t = useTranslations('inbox.composer');
  const { styles, cx } = useComposerStyles();
  const { styles: ps } = usePopStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const canned = useQuery({ ...cannedQuery(), enabled: ui.pop === 'qr' });
  if (ui.pop !== 'qr' && ui.pop !== 'sched' && ui.pop !== 'xl' && ui.pop !== 'attach') return null;

  return (
    <>
      <div className={base.veil} onClick={ui.closePop} />
      {ui.pop === 'attach' ? <AgentToolsMenu conversationId={conv.id} onClose={ui.closePop} onPickFile={onPickFile} onCapture={onCapture} /> : null}
      {ui.pop === 'qr' ? (
        <div className={ps.pop} data-testid="qr-pop">
          <div className={ps.popHead}>
            <Icon name="ic-bolt" size={16} color={color.amberGold} />
            {t('qr.title')}
            <span className={ps.popHint}>{t('qr.hint')}</span>
          </div>
          <div className={ps.popBody}>
            {(canned.data ?? []).map((g) => (
              <div key={g.group} className={styles.actions}>
                <div className={ps.popHint}>{g.group}</div>
                <div className={ps.grid2}>
                  {g.items.map(([cmd, title, body]) => (
                    <button key={cmd} type="button" className={ps.qr} onClick={() => onInsert(body.replace('{tên}', customer))}>
                      <span className={ps.qrCmd}>{cmd}</span>
                      <span className={ps.qrTitle}>{title}</span>
                      <div className={ps.qrPreview}>{body}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {ui.pop === 'sched' ? <SchedulingPopover conv={conv} customer={customer} onInsert={onInsert} onClose={ui.closePop} /> : null}
      {ui.pop === 'xl' ? <TranslationPopover pref={xl} onChange={onXl} /> : null}
    </>
  );
}
