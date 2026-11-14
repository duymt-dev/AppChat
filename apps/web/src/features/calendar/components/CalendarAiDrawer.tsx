// Panel "Trợ lý AI · Lịch hẹn" — prototype L4157–4184 (bkAiSuggests L11116). TIP-023c G2: mỗi thẻ gửi prompt soạn sẵn tới Trợ lý THẬT
// (surface drawer); "Gọi xác nhận khách chờ" lọc thêm Chờ xác nhận, "Lấp khung giờ trống" chỉ mở form tạo lịch; "Mở Trợ lý AI đầy đủ"
// mở màn Trợ lý cùng phiên.
'use client';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient, type IconName } from '@appchat/ui';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useDrawerAsk } from '@/shared/assistant/useDrawerAsk';
import { RecordDrawerSection, useRecordBound } from '@/shared/assistant/record-intent/RecordDrawerSection';
import { useMe } from '@/shared/shell/useShellData';
import { useCalAiStyles } from '../styles/ai.styles';
import { useCalendarUi } from '../calendar-store';
import type { CalendarMeta } from '../types';

const LOOK: Record<string, [IconName, string]> = {
  confirm: ['ic-phone', color.amberDeep],
  gap: ['ic-cal', color.blue],
  follow: ['ic-bell', color.purple],
  report: ['ic-chart', color.brandInk],
};

export function CalendarAiDrawer({ meta }: { meta: CalendarMeta }) {
  const t = useTranslations('calendar.aiPanel');
  const { styles } = useCalAiStyles();
  const ui = useCalendarUi();
  const me = useMe().data;
  const { asst, draft, setDraft, send, ask } = useDrawerAsk('calendar');
  const bound = useRecordBound('calendar');
  const close = () => ui.set({ aiOpen: false });
  const run = (k: string) => {
    if (k === 'confirm') ui.setFilter({ status: 'pending' });
    if (k === 'gap') return ui.set({ aiOpen: false, form: 'create', prefill: { date: meta.today } });
    ask(t(`prompts.${k}` as never));
  };
  return (
    <EntityDrawer
      open={ui.aiOpen}
      onClose={close}
      title={t('title')}
      subtitle={t('sub')}
      icon="ic-spark"
      iconBg={gradient.ai}
      tinted
      closeLabel={t('close')}
      testId="cal-ai"
      footer={
        bound ? undefined : (
          <div className={styles.foot}>
            <div className={styles.box}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={t('ph')}
                aria-label={t('ph')}
              />
              <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
                <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
              </button>
            </div>
            <button
              type="button"
              className={styles.full}
              onClick={() => (close(), asst.openFull())}
              data-testid="cal-ai-full"
            >
              <Icon name="ic-spark" size={14} color={color.violetInk} />
              {t('full')}
            </button>
          </div>
        )
      }
    >
      <RecordDrawerSection module="calendar" testId="cal-rai" />
      {bound ? null : (
        <>
          <div className={styles.body}>
            <div className={styles.hello}>
              <span className={styles.bot}>
                <Icon name="ic-spark" size={16} color={color.sparkMint} />
              </span>
              <div className={styles.bubble}>
                {t('hello', { name: me?.user.name.split(' ').at(-1) ?? '' })}
              </div>
            </div>
            <div className={styles.list}>
              {meta.ai.map(([k, title, desc]) => {
                const [ic, c] = LOOK[k] ?? LOOK.report!;
                return (
                  <button
                    key={k}
                    type="button"
                    className={styles.card}
                    onClick={() => run(k)}
                    disabled={asst.typing}
                    data-testid={`cal-ai-${k}`}
                  >
                    <div className={styles.cardH}>
                      <span className={styles.cardIc} style={{ background: `${c}18` }}>
                        <Icon name={ic} size={15} color={c} />
                      </span>
                      {title}
                    </div>
                    <div className={styles.cardD}>{desc}</div>
                  </button>
                );
              })}
            </div>
            <ScreenAssistantThread
              msgs={asst.msgs}
              typing={asst.typing}
              onDecide={(m, d) => void asst.decide(m, d)}
              onUi={asst.runUi}
              testId="cal-ai-msgs"
            />
          </div>
        </>
      )}
    </EntityDrawer>
  );
}
