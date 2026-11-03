// Drawer "Trợ lý AI · Khách hàng" — prototype L2938–2981. "Soạn ZNS" là mục OUT (prototype-parity §6) — không có.
// TIP-023c G2: ô hỏi + "Phân tích nhanh" / "Thao tác hàng loạt" gửi lượt Trợ lý THẬT (surface drawer, ngữ cảnh: khách đang mở + dòng đang
// chọn) — mỗi nút là một prompt soạn sẵn (standard §10); trả lời / thẻ xác nhận / cây GenUI gọn hiện trong drawer. "Mở Trợ lý AI đầy đủ"
// mở màn Trợ lý cùng phiên.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, gradient, type IconName } from '@appchat/ui';
import { useMe } from '@/shared/shell/useShellData';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useScreenAssistant } from '@/shared/assistant/useScreenAssistant';
import { useAiStyles } from '../styles/ai.styles';
import { useCrmUi } from '../crm-store';

const QUICK: [key: string, icon: IconName, tone: string][] = [
  ['pipeline', 'ic-chart', color.blue],
  ['churn', 'ic-bell', color.dangerStrong],
  ['dedupe', 'ic-filter', color.dangerDeep],
];
const BULK: [key: string, icon: IconName, tone: string][] = [
  ['assign', 'ic-users', color.assignIcon],
  ['upsell', 'ic-gift', color.brandInk],
];

export function CrmAiDrawer() {
  const t = useTranslations('customers.crmAi');
  const { styles, cx } = useAiStyles();
  const ui = useCrmUi();
  const me = useMe().data;
  const asst = useScreenAssistant('customers');
  const [draft, setDraft] = useState('');
  const close = () => ui.set({ modal: null });

  /** Nút cố định theo màn = prompt soạn sẵn gửi Trợ lý (standard §10). */
  const run = (key: string) => void asst.send(t(`prompts.${key}` as never));
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void asst.send(text);
  };
  const list = (items: typeof QUICK) => (
    <div className={styles.list}>
      {items.map(([key, icon, tone]) => (
        <button key={key} type="button" className={styles.cmd} onClick={() => run(key)} disabled={asst.typing} data-testid={`crm-ai-run-${key}`}>
          <Icon name={icon} size={15} color={tone} />
          {t(`runs.${key}` as never)}
        </button>
      ))}
    </div>
  );

  return (
    <EntityDrawer
      open={ui.modal === 'ai'}
      onClose={close}
      tinted
      iconBg={gradient.upgrade}
      title={t('title')}
      subtitle={t('sub')}
      closeLabel={t('close')}
      testId="crm-ai-drawer"
      footer={
        <div className={styles.foot}>
          <div className={styles.ask}>
            <input className={styles.input} value={draft} placeholder={t('ask')} aria-label={t('ask')} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button type="button" className={styles.send} onClick={send} aria-label={t('send')}>
              <Icon name="ic-send" size={16} color={color.white} strokeWidth={2} />
            </button>
          </div>
          <button
            type="button"
            className={styles.full}
            data-testid="crm-ai-full"
            onClick={() => {
              close();
              asst.openFull();
            }}
          >
            <Icon name="ic-spark" size={14} color={color.violetInk} strokeWidth={1.9} />
            {t('full')}
          </button>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.bot}>
          <span className={styles.botAv}>
            <Icon name="ic-spark" size={16} color={color.sparkMint} strokeWidth={1.9} />
          </span>
          <div className={styles.botMsg}>{t('hello', { name: me?.user.name ?? '' })}</div>
        </div>
        <ScreenAssistantThread msgs={asst.msgs} typing={asst.typing} onDecide={(m, d) => void asst.decide(m, d)} onUi={asst.runUi} testId="crm-ai-msgs" />
        <div className={styles.section}>{t('quick')}</div>
        {list(QUICK)}
        <div className={cx(styles.section, styles.sectionGap)}>{t('bulk')}</div>
        {list(BULK)}
      </div>
    </EntityDrawer>
  );
}
