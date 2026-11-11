// Ô soạn của Trợ lý — prototype L1201–1222 (màn chào), L1294–1311 (đáy hội thoại), L1404–1419 (Cowork).
// Mức AI thay tên model (D29). Enter gửi, Shift+Enter xuống dòng, Ctrl+U thêm tệp; thả / dán tệp (TIP-023f §4.1 — khay phía trên ô soạn,
// Gửi khoá tới khi mọi tệp sẵn sàng). Ảnh chụp màn hình xem lại trước khi đính kèm; mic = đọc chính tả của trình duyệt, xem lại rồi chèn.
'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, color } from '@appchat/ui';
import type { AttachReject } from '@/shared/assistant/attachment-extensions';
import { useComposerStyles } from '../styles/composer.styles';
import { useAssistantUi } from '../assistant-store';
import { useAssistantAttachments } from '../hooks/useAssistantAttachments';
import { UtilityHost } from '@/shared/ai-utilities';
import { useAssistantCapture } from '../hooks/useAssistantCapture';
import { useAssistantDictation } from '../hooks/useAssistantDictation';
import { registerCapture } from '../hooks/attachment-store';
import { AttachmentTray, openAttachPicker } from './AttachmentTray';
import { AttachmentPreview } from './AttachmentPreview';
import { VoiceInput } from './VoiceInput';
import type { Mode } from '../types';

const MODES: Mode[] = ['chat', 'cowork'];

export interface ComposerProps {
  rows: number;
  placeholder: string;
  onSend: () => void;
  /** Màn chào có thêm nút ⚡ lệnh nhanh và mic. */
  full?: boolean;
  sendIcon?: 'up' | 'plane';
  onMode?: (m: Mode) => void;
  testId?: string;
}

export function Composer({ rows, placeholder, onSend, full, sendIcon = 'up', onMode, testId }: ComposerProps) {
  const t = useTranslations('assistant');
  const tAll = useTranslations();
  const { styles, cx } = useComposerStyles();
  const ui = useAssistantUi();
  const setMode = (m: Mode) => (onMode ? onMode(m) : ui.set({ mode: m, pop: null }));
  const { message } = App.useApp();
  const att = useAssistantAttachments(useCallback((name: string, why: AttachReject) => void message.warning(`${name}: ${t(`attachments.rejected.${why}`)}`), [message, t]));
  const closeUtility = useCallback(() => useAssistantUi.getState().set({ utility: null }), []);
  const area = useRef<HTMLTextAreaElement>(null);
  const rev = useRef(0);
  const scope = `${ui.sessionId ?? ''}:${ui.mode}`;
  const capture = useAssistantCapture(scope, att.add);
  useEffect(() => registerCapture(() => void capture.start()), [capture]);
  const draft = useMemo(
    () => ({
      read: () => ({ text: useAssistantUi.getState().draft, rev: rev.current, caret: area.current?.selectionStart ?? useAssistantUi.getState().draft.length }),
      write: (text: string) => {
        rev.current++;
        useAssistantUi.getState().set({ draft: text });
      },
    }),
    [],
  );
  const voice = useAssistantDictation(useLocale(), draft, scope);
  const canSend = att.ready && (!!ui.draft.trim() || att.items.length > 0);
  const send = () => canSend && onSend();

  return (
    <div className={styles.box} data-testid={testId}>
      <UtilityHost selected={ui.utility} ctx={{}} onClose={closeUtility} />
      <AttachmentPreview state={capture.state} onAccept={capture.accept} onCancel={capture.cancel} onPickFile={openAttachPicker} />
      <VoiceInput d={voice} />
      <AttachmentTray items={att.items} onAdd={att.add} onRemove={att.remove} onRetry={att.retry} onHint={(k) => draft.write(tAll(k as never))} />
      <textarea
        ref={area}
        className={styles.area}
        rows={rows}
        value={ui.draft}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => draft.write(e.target.value)}
        onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          att.add(e.dataTransfer.files);
        }}
        onPaste={(e) => {
          if (!e.clipboardData.files.length) return;
          e.preventDefault();
          att.add(e.clipboardData.files);
        }}
        onKeyDown={(e) => {
          if (e.key.toLowerCase() === 'u' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            openAttachPicker();
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className={styles.row}>
        <button type="button" className={styles.icoBtn} aria-label={t('attach')} data-testid="asst-plus" onClick={(e) => ui.openPop('plus', e.currentTarget)}>
          <Icon name="ic-plus" size={17} />
        </button>
        {full ? (
          <button type="button" className={styles.icoBtn} aria-label={t('quick')} title={t('quick')} data-testid="asst-quick" onClick={(e) => ui.openPop('utility', e.currentTarget)}>
            <Icon name="ic-bolt" size={17} />
          </button>
        ) : null}
        <div className={styles.seg} role="radiogroup">
          {MODES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={ui.mode === m} className={cx(styles.segBtn, ui.mode === m && styles.segOn)} onClick={() => setMode(m)}>
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
        {ui.mode === 'cowork' ? (
          <button type="button" className={styles.agentChip} data-testid="asst-agent" onClick={(e) => ui.openPop('agent', e.currentTarget)}>
            <Icon name="ic-bot" size={13} color={color.violet} strokeWidth={2} />
            {ui.agent ? t('agentSuffix', { name: ui.agent }) : t('agentNone')}
          </button>
        ) : null}
        <span className={styles.grow} />
        <button type="button" className={styles.tierPill} data-testid="asst-tier" onClick={(e) => ui.openPop('tier', e.currentTarget)}>
          {t(`tier.${ui.tier}`)}
          <span className={styles.effort}>{t('tier.effortHigh')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" style={{ stroke: color.text3, fill: 'none', strokeWidth: 2.2 }} aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {full ? (
          <button type="button" className={styles.mic} aria-label={t('voice')} title={t('voice')} data-testid="asst-mic" aria-pressed={voice.state.kind === 'listening'} onClick={voice.state.kind === 'listening' ? voice.stop : voice.start}>
            <Icon name="ic-mic" size={17} />
          </button>
        ) : null}
        <button type="button" className={styles.send} aria-label={t('send')} data-testid="asst-send" disabled={!att.ready} onClick={send}>
          {sendIcon === 'plane' ? (
            <Icon name="ic-send" size={17} color={color.white} strokeWidth={1.3} style={{ fill: color.white }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ stroke: color.white, fill: 'none', strokeWidth: 2.2 }} aria-hidden="true">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
