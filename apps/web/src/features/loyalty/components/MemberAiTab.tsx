// Tab AI của drawer thành viên — prototype L4700–4712. Nhận định là số thật của thành viên (hạng / điểm / điểm cần lên hạng / sắp hết
// hạn — không lấy t.raw làm kết quả); "Gợi ý hành động" gửi lượt THẬT tới Trợ lý màn loyalty (TIP-023c) kèm ngữ cảnh khách / hạng / điểm —
// thẻ xác nhận, lỗi, quyền hiện trong luồng trả lời; không tự gửi tin cho khách.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { ScreenAssistantThread } from '@/shared/assistant/ScreenAssistantThread';
import { useScreenAssistant } from '@/shared/assistant/useScreenAssistant';
import { useDrawerStyles } from '../styles/drawer.styles';

import type { Member } from '../types';
import { useLadder } from './MemberTabs';
import { useFmt } from '@/shared/i18n/useFmt';

const ACTS = ['keep', 'care', 'expiring'] as const;

export function AiTab({ m }: { m: Member }) {
  const fmt = useFmt();
  const t = useTranslations('loyalty.dr');
  const tt = useTranslations('loyalty.tier');
  const { styles } = useDrawerStyles();
  const { next, need } = useLadder(m);
  const asst = useScreenAssistant('loyalty');
  const ctx = { name: m.name, phone: m.phone, tier: tt(m.tier), points: fmt.number(m.points), expiring: fmt.number(m.expiring) };
  return (
    <>
      <div className={styles.card}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>{t('aiT')}</span>
        </div>
        <div className={styles.ai} data-testid="ly-ai-insight">
          <Icon name="ic-spark" size={14} color={color.brandInk} />
          <span>{next ? t.rich('aiD', { n: fmt.number(need), t: tt(next.key), b: (c) => <b>{c}</b> }) : t('aiMax')}</span>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.eyebrowRow}>
          <span className={styles.eyebrow}>{t('aiActs')}</span>
        </div>
        {ACTS.map((a) => (
          <button key={a} type="button" className={styles.act} disabled={asst.typing} onClick={() => void asst.send(t(`acts.${a}.prompt`, ctx))} data-testid={`ly-ai-act-${a}`}>
            <span className={styles.grow}>{t(`acts.${a}.label`)}</span>
            <Icon name="ic-arrow" size={14} color={color.brandInk} />
          </button>
        ))}
      </div>
      <ScreenAssistantThread msgs={asst.msgs} typing={asst.typing} onDecide={(msg, d) => void asst.decide(msg, d)} onUi={asst.runUi} testId="ly-ai-msgs" />
    </>
  );
}
