// Ô soạn tin — prototype ver2.1 L2195–2245: Ghi chú nội bộ / Co-pilot / AI tự xử · Quick replies / Đặt lịch hẹn / Dịch ·
// trích dẫn khi trả lời · dòng "Người gửi" · Gửi. REQ-C13: bỏ chế độ "Trả lời" (ngầm định) và 6 icon công cụ, bỏ "Thả nhanh".
// TIP-025: chế độ AI hiện tại được đánh dấu, bấm lại chế độ đang bật = Tắt AI; tệp đính kèm (menu ＋ "Thêm tệp"); @nhắc trong ghi chú.
'use client';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useMe } from '@/shared/shell/useShellData';
import { useComposerStyles } from '../styles/composer.styles';
import { useInboxUi } from '../inbox-store';
import { useComposerFiles } from '../hooks/useComposerFiles';
import { ComposerPopovers } from './ComposerPopovers';
import { FileChips, MentionPicker, mentionNeedle } from './ComposerExtras';
import type { ChannelMeta, Conversation } from '../types';

/** 3 icon trang trí còn lại sau khi bỏ 6 icon công cụ (REQ-C13) — không có onClick, giữ đúng số lượng của prototype. */
const DECOR: IconName[] = ['ic-smile', 'ic-clip', 'ic-image'];

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
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const files = useComposerFiles();
  const picker = useRef<HTMLInputElement>(null);
  const mentions = useRef(new Map<string, string>());
  const isNote = ui.composerMode === 'note';
  const customer = conv.kind === 'group' ? conv.title : conv.title.split(' — ')[0]!;
  const needle = isNote ? mentionNeedle(draft) : null;

  const submit = async () => {
    const text = draft.trim();
    const withFiles = !isNote && files.ids.length > 0;
    if ((!text && !withFiles) || busy || !files.ready) return;
    setBusy(true);
    // Chỉ gửi người còn được nhắc trong chữ (xoá "@Tên" khỏi ô soạn = bỏ nhắc).
    const ids = [...mentions.current].filter(([, name]) => text.includes(`@${name}`)).map(([id]) => id);
    const res = isNote
      ? await note.run({ conversation_id: conv.id, text, ...(ids.length ? { mentions: ids } : {}) }, { silent: true })
      : await send.run({ conversation_id: conv.id, text, ...(ui.replyTo ? { reply_to_id: ui.replyTo.id } : {}), ...(withFiles ? { attachments: files.ids } : {}) }, { silent: true });
    setBusy(false);
    if (res) {
      onDraft('');
      ui.set({ replyTo: null });
      files.clear();
      mentions.current.clear();
    }
  };

  // Chế độ AI hiện tại sáng lên; bấm lại chế độ đang bật = Tắt AI (người tự xử lý).
  const setMode = (m: 'copilot' | 'auto') => void aiMode.run({ conversation_id: conv.id, ai_mode: conv.ai_mode === m ? 'off' : m });
  const modes: [key: 'note' | 'copilot' | 'auto', icon: IconName, tone: string, onClick: () => void][] = [
    ['note', 'ic-doc', isNote ? color.text : color.text3, () => ui.set({ composerMode: isNote ? 'reply' : 'note' })],
    ['copilot', 'ic-spark', color.brandInk, () => setMode('copilot')],
    ['auto', 'ic-bot', color.violetInk, () => setMode('auto')],
  ];
  const on = (key: string) => (key === 'note' ? isNote : conv.ai_mode === key);
  const tools: [key: 'qr' | 'sched' | 'xl', icon: IconName][] = [
    ['qr', 'ic-bolt'],
    ['sched', 'ic-cal'],
    ['xl', 'ic-globe'],
  ];

  if (!canReply) return null;

  return (
    <div className={styles.wrap} data-testid="composer">
      <ComposerPopovers conv={conv} customer={customer} onInsert={(v) => (onDraft(v), ui.closePop())} onPickFile={() => picker.current?.click()} />
      <input ref={picker} type="file" multiple hidden onChange={(e) => (void files.add(e.target.files), (e.target.value = ''))} data-testid="composer-file-input" />
      {needle !== null ? (
        <MentionPicker
          needle={needle}
          onPick={(m) => {
            mentions.current.set(m.id, m.name);
            onDraft(draft.replace(/@[\p{L}\d_]*$/u, `@${m.name} `));
          }}
        />
      ) : null}
      <div className={styles.modes}>
        {modes.map(([key, icon, tone, onClick]) => (
          <button key={key} type="button" className={cx(styles.mode, on(key) && styles.modeOn)} style={{ color: tone }} onClick={onClick} aria-pressed={on(key)} data-testid={`mode-${key}`}>
            <Icon name={icon} size={14} color="currentColor" />
            {t(`modes.${key}` as never)}
          </button>
        ))}
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
        {!isNote ? <FileChips files={files.files} onRemove={files.remove} /> : null}
        {ui.replyTo && !isNote ? (
          <div className={styles.replyBar} data-testid="composer-reply">
            <span className={styles.grow}>
              {t('replyingTo')} {ui.replyTo.preview}
            </span>
            <button type="button" className={styles.replyX} onClick={() => ui.set({ replyTo: null })} aria-label={t('cancelReply')}>
              <Icon name="ic-x" size={13} color={color.text3} />
            </button>
          </div>
        ) : null}
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
          {DECOR.map((ic) => (
            <Icon key={ic} name={ic} size={18} strokeWidth={1.7} color="currentColor" />
          ))}
          <span className={styles.grow} />
          {!isNote ? (
            <span className={styles.via}>
              {t.rich('senderLine', { name: me.data?.user.name.split(' ').at(-1) ?? '', b: (c) => <b style={{ color: channel?.color }}>{c}</b> })}
            </span>
          ) : null}
          <button type="button" className={styles.send} onClick={() => void submit()} disabled={(!draft.trim() && (isNote || !files.ids.length)) || busy || !files.ready} data-testid="composer-send">
            <Icon name="ic-send" size={15} color={color.white} />
            {isNote ? t('saveNote') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
