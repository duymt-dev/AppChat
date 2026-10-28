// Ô soạn tin — prototype L1869–1902: chế độ (Trả lời / Ghi chú nội bộ / Co-pilot / AI tự xử) · công cụ · ô nhập · Gửi · thả nhanh.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useComposerStyles } from '../styles/composer.styles';
import { useInboxUi } from '../inbox-store';
import { ComposerPopovers } from './ComposerPopovers';
import type { ChannelMeta, Conversation } from '../types';

const ICONS: IconName[] = ['ic-smile', 'ic-clip', 'ic-image', 'ic-mic', 'ic-phone', 'ic-video', 'ic-bolt', 'ic-cal', 'ic-globe'];
const REACTS = ['❤️', '👍', '😄', '😮', '😢', '🙏', '🔥'];

export interface ComposerProps {
  conv: Conversation;
  channel: ChannelMeta | undefined;
  /** Bản nháp đưa vào ô soạn (từ "Chỉnh sửa" gợi ý AI). */
  draft: string;
  onDraft: (v: string) => void;
}

export function Composer({ conv, channel, draft, onDraft }: ComposerProps) {
  const t = useTranslations('inbox.composer');
  const { styles, cx } = useComposerStyles();
  const ui = useInboxUi();
  const canReply = useCan('inbox.reply');
  const send = useAction('message.send');
  const note = useAction('note.add');
  const aiMode = useAction('conversation.set_ai_mode');
  const [busy, setBusy] = useState(false);
  const isNote = ui.composerMode === 'note';
  const customer = conv.kind === 'group' ? conv.title : conv.title.split(' — ')[0]!;

  const submit = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = isNote ? await note.run({ conversation_id: conv.id, text }, { silent: true }) : await send.run({ conversation_id: conv.id, text }, { silent: true });
    setBusy(false);
    if (res) onDraft('');
  };

  const modes: [key: string, icon: IconName, tone: string, onClick: () => void][] = [
    ['reply', 'ic-send', color.text, () => ui.set({ composerMode: 'reply' })],
    ['note', 'ic-doc', color.text3, () => ui.set({ composerMode: 'note' })],
    ['copilot', 'ic-spark', color.brandInk, () => void aiMode.run({ conversation_id: conv.id, ai_mode: 'copilot' })],
    ['auto', 'ic-bot', color.violetInk, () => void aiMode.run({ conversation_id: conv.id, ai_mode: 'auto' })],
  ];
  const tools: [key: 'qr' | 'sched' | 'xl', icon: IconName][] = [
    ['qr', 'ic-bolt'],
    ['sched', 'ic-cal'],
    ['xl', 'ic-globe'],
  ];

  if (!canReply) return null;

  return (
    <div className={styles.wrap} data-testid="composer">
      <ComposerPopovers customer={customer} onInsert={(v) => (onDraft(v), ui.closePop())} />
      <div className={styles.modes}>
        {modes.map(([key, icon, tone, onClick]) => {
          const on = (key === 'reply' && !isNote) || (key === 'note' && isNote);
          return (
            <button key={key} type="button" className={cx(styles.mode, on && styles.modeOn)} style={{ color: on ? color.text : tone }} onClick={onClick} aria-pressed={on}>
              <Icon name={icon} size={14} color="currentColor" />
              {t(`modes.${key}` as never)}
            </button>
          );
        })}
        <span className={styles.grow} />
        {tools.map(([key, icon]) => (
          <button key={key} type="button" className={cx(styles.tool, key === 'xl' && ui.autoXl && styles.toolOn)} onClick={() => ui.togglePop(key)} aria-expanded={ui.pop === key}>
            <Icon name={icon} size={14} color={color.text3} />
            {t(`tools.${key}` as never)}
            {key === 'xl' && ui.autoXl ? <span className={styles.auto}>{t('autoBadge')}</span> : null}
          </button>
        ))}
      </div>
      <div className={cx(styles.box, isNote && styles.boxNote)}>
        <textarea
          className={styles.input}
          rows={1}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={isNote ? t('notePlaceholder') : t('placeholder', { name: customer })}
          aria-label={t('placeholder', { name: customer })}
          data-testid="composer-input"
        />
        <div className={styles.bar}>
          <button type="button" className={styles.plus} title={t('attach')} aria-label={t('attach')} onClick={() => ui.togglePop('attach')}>
            <Icon name="ic-plus" size={14} color={color.chatIcon} />
          </button>
          {ICONS.map((ic) => (
            <button key={ic} type="button" className={styles.ico} aria-label={ic}>
              <Icon name={ic} size={18} strokeWidth={1.7} color="currentColor" />
            </button>
          ))}
          <span className={styles.grow} />
          <span className={styles.via}>
            {t.rich('via', { ch: channel?.label ?? '', b: (c) => <b style={{ color: channel?.color }}>{c}</b>, k: (c) => <kbd className={styles.kbd}>{c}</kbd> })}
          </span>
          <button type="button" className={styles.send} onClick={() => void submit()} disabled={!draft.trim() || busy} data-testid="composer-send">
            <Icon name="ic-send" size={15} color={color.white} />
            {isNote ? t('saveNote') : t('send')}
          </button>
        </div>
      </div>
      <div className={styles.react}>
        {t('quickReact')}
        {REACTS.map((r) => (
          <button key={r} type="button" className={styles.emoji} onClick={() => onDraft(draft + r)}>
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
