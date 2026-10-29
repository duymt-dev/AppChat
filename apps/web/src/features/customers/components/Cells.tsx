// Ô dùng lại giữa bảng, kanban và thẻ mobile: tên + avatar, kênh, trạng thái, phụ trách, AI gợi ý.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useCellStyles } from '../styles/cells.styles';
import { useCrmUi } from '../crm-store';
import { STATUS_TONE, avatarBg, ownerBg } from '../tones';
import type { ContactRow } from '../types';

export function NameCell({ c }: { c: ContactRow }) {
  const t = useTranslations('customers');
  const { styles } = useCellStyles();
  const shared = c.my_access === 'collaborator' || c.my_access === 'watcher';
  return (
    <div className={styles.nameCell}>
      <div className={styles.avatar} style={{ background: avatarBg(c.avatar_hue) }}>
        {c.initials}
      </div>
      <div className={styles.min0}>
        <div className={styles.name}>
          {c.full_name}
          {shared ? (
            <span className={styles.share} data-testid="co-owner-badge">
              {t(c.my_access === 'watcher' ? 'watcher' : 'coOwner')}
            </span>
          ) : null}
        </div>
        <div className={styles.sub}>{c.title}</div>
      </div>
    </div>
  );
}

export function ChannelCell({ c }: { c: ContactRow }) {
  const t = useTranslations('customers');
  const { styles } = useCellStyles();
  return (
    <span className={styles.chan}>
      <span className={styles.dot} style={{ background: c.source_color }} />
      {t(`source.${c.source}`)}
    </span>
  );
}

export function StatusCell({ c }: { c: ContactRow }) {
  const t = useTranslations('customers');
  const { styles } = useCellStyles();
  const tone = STATUS_TONE[c.status];
  return (
    <span className={styles.status} style={{ color: tone.fg, background: tone.bg }}>
      {t(`status.${c.status}`)}
    </span>
  );
}

export function OwnerCell({ c }: { c: ContactRow }) {
  const t = useTranslations('customers');
  const { styles } = useCellStyles();
  const bg = ownerBg(c);
  return (
    <div className={styles.owner}>
      <div className={styles.ownerAv} style={{ background: bg ?? color.violet }}>
        {bg ? c.owner_name[0] : t('aiOwner')}
      </div>
      <span className={styles.cell}>{c.owner_name}</span>
    </div>
  );
}

export function AiCell({ c, onAiDo }: { c: ContactRow; onAiDo: () => void }) {
  const t = useTranslations('customers');
  const { styles, cx } = useCellStyles();
  const open = useCrmUi((s) => s.open);
  return (
    <div className={styles.aiCell} onClick={(e) => e.stopPropagation()}>
      <span className={styles.aiHint} title={c.ai.hint}>
        {t('ai.hint', { hint: c.ai.hint })}
      </span>
      {c.ai.kind === 'wait' ? (
        <button type="button" className={cx(styles.aiBtn, styles.aiDo)} title={t('ai.do')} aria-label={t('ai.do')} onClick={onAiDo}>
          <Icon name="ic-bolt" size={12} color={color.white} strokeWidth={2.2} />
        </button>
      ) : null}
      <button type="button" className={cx(styles.aiBtn, styles.aiPeek)} title={t('ai.peek')} aria-label={t('ai.peek')} onClick={() => open('peek', c.id)}>
        <Icon name="ic-spark" size={12} color={color.violet} strokeWidth={1.9} />
      </button>
    </div>
  );
}
