// Khung Trợ lý gắn MỘT bản ghi (TIP-023g §1.3, §2): dải "đang gắn <mã>", lựa chọn ý định, ô việc sửa được, nút Gửi. Mở khung = 0 lời gọi
// model / 0 ghi — chỉ khi người dùng bấm Gửi mới có lượt thật. Gợi ý soạn sẵn (vd. việc của Đề nghị thanh toán) là chữ được TRÍCH vào ô việc,
// không bao giờ là id action / lệnh. Đề xuất combo / chiến dịch hiện thẻ chỉ đọc; áp dụng đi luồng xác nhận chuẩn của module.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PROPOSAL_INTENTS, type RecordIntentKind, type RecordProposalDto } from '@appchat/shared';
import { ScreenAssistantThread } from '../ScreenAssistantThread';
import { RecordIntentCard } from './RecordIntentCard';
import { useRecordIntentStyles } from './record-intent.styles';
import { useRecordAssistant } from './useRecordAssistant';
import type { RecordIntentChoice, RecordScope } from './types';

export interface RecordAssistantPanelProps {
  module: string;
  scope: RecordScope | null;
  /** Lựa chọn ý định của bản ghi (mặc định: chỉ "Hỏi về bản ghi này"). */
  choices?: readonly RecordIntentChoice[];
  /** Việc điền sẵn (gợi ý đã chọn) — người dùng sửa / xoá được trước khi gửi. */
  prefill?: string;
  onApply?: (v: RecordProposalDto) => void;
  testId?: string;
}

const INSPECT: RecordIntentChoice = { intent: 'inspect', labelKey: 'intent.inspect' };

export function RecordAssistantPanel({
  module,
  scope,
  choices = [INSPECT],
  prefill,
  onApply,
  testId = 'rai',
}: RecordAssistantPanelProps) {
  const t = useTranslations('common.recordAi');
  const { styles } = useRecordIntentStyles();
  const { asst, submit, propose, proposal } = useRecordAssistant(module, scope);
  const [picked, setPicked] = useState(0);
  const intent: RecordIntentKind = choices[picked]?.intent ?? 'inspect';
  const [task, setTask] = useState(prefill ?? '');
  if (!scope) return null;
  const isProposal = PROPOSAL_INTENTS.includes(intent);
  const busy = asst.typing || proposal.pending;
  const go = () =>
    isProposal ? void propose(intent, task) : void submit(task, intent).then(() => setTask(''));
  return (
    <div className={styles.wrap} data-testid={testId} data-entity={scope.entity} data-record={scope.id}>
      <div className={styles.bound} data-testid={`${testId}-bound`}>
        <Icon name="ic-spark" size={12} color={color.violet} />
        <span>{t('bound', { label: scope.label || scope.id })}</span>
      </div>
      {choices.length > 1 ? (
        <div className={styles.chips} role="group" aria-label={t('intentGroup')}>
          {choices.map((c, idx) => (
            <button
              key={`${c.intent}-${idx}`}
              type="button"
              className={styles.chip}
              aria-pressed={idx === picked}
              onClick={() => {
                setPicked(idx);
                if (c.task !== undefined) setTask(c.task);
              }}
              data-testid={`${testId}-intent-${c.intent}`}
            >
              {c.label ?? t(c.labelKey as never)}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        className={styles.task}
        value={task}
        onChange={(e) => setTask(e.target.value)}
        maxLength={2000}
        placeholder={t(isProposal ? 'taskOptional' : 'taskPh')}
        aria-label={t('taskLabel')}
        data-testid={`${testId}-task`}
      />
      <div className={styles.row}>
        <button
          type="button"
          className={styles.send}
          disabled={busy || (!isProposal && !task.trim())}
          onClick={go}
          data-testid={`${testId}-submit`}
        >
          {busy ? t('working') : t(isProposal ? 'suggest' : 'send')}
        </button>
      </div>
      {proposal.errorCode ? (
        <div className={styles.muted} role="alert" data-testid={`${testId}-error`}>
          {t(
            `error.${['NOT_FOUND', 'FORBIDDEN', 'CONFLICT'].includes(proposal.errorCode) ? proposal.errorCode : 'other'}`,
          )}
        </div>
      ) : null}
      {proposal.value ? <RecordIntentCard value={proposal.value} {...(onApply ? { onApply } : {})} /> : null}
      <ScreenAssistantThread
        msgs={asst.msgs}
        typing={asst.typing}
        onDecide={(m, d) => void asst.decide(m, d)}
        onUi={asst.runUi}
        onOpenFull={asst.openFull}
        testId={`${testId}-msgs`}
      />
    </div>
  );
}
