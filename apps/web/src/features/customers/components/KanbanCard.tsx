// Thẻ khách trên KanbanBoard — prototype L2554–2590. Gắn / bỏ tag qua contact.tag.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, gradient } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useKanbanCardStyles } from '../styles/kanban.styles';
import { useCrmUi } from '../crm-store';
import { avatarBg } from '../tones';
import { RowActions } from '../columns';
import { KanbanCustomFields } from './KanbanCustomFields';
import type { ContactRow, CrmStats } from '../types';

// dải "website" theo vị trí khách (prototype KAN_WEBBG) — gradient token
const WEB_BG = [gradient.kanbanBlue, gradient.kanbanGreen, gradient.kanbanViolet, gradient.kanbanPink, gradient.kanbanAmber, gradient.kanbanSky];

export function KanbanCard({ c, tagDefs }: { c: ContactRow; tagDefs: CrmStats['tag_defs'] }) {
  const t = useTranslations('customers.kanban');
  const { styles } = useKanbanCardStyles();
  const ui = useCrmUi();
  const tag = useAction('contact.tag');
  const canEdit = useCan('crm.edit');
  const def = (l: string) => tagDefs.find((d) => d.label === l);
  const toggle = (l: string) => void tag.run({ contact_id: c.id, tag: l, op: c.tags.includes(l) ? 'remove' : 'add' }, { silent: true });
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const domain = c.email.slice(c.email.indexOf('@') + 1);

  return (
    <div className={styles.card} onClick={() => ui.set({ detail: c.id })} data-contact={c.id} data-testid="kanban-card">
      <div className={styles.web} style={{ background: WEB_BG[c.web_bg % WEB_BG.length] }}>
        <span className={styles.webIcon}>
          <Icon name="ic-globe" size={11} color={c.source_color} strokeWidth={2} />
        </span>
        <span className={styles.domain}>{domain}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.top}>
          <span className={styles.av} style={{ background: avatarBg(c.avatar_hue) }}>
            {c.initials}
          </span>
          <div className={styles.grow}>
            <div className={styles.name}>{c.full_name}</div>
            <div className={styles.sub}>{c.title === '—' ? c.city : c.title}</div>
          </div>
          <RowActions c={c} variant="kanban" />
        </div>
        <KanbanCustomFields custom={c.custom} />
        <div className={styles.chan}>
          <span className={styles.chanDot} style={{ background: c.source_color }} />
          <span className={styles.chanName}>{c.source_label}</span>
        </div>
        <div className={styles.tags} onClick={stop}>
          {c.tags.map((l) => (
            <span key={l} className={styles.tag} style={{ background: def(l)?.bg ?? color.muteBg, color: def(l)?.fg ?? color.text3 }}>
              {l}
              {canEdit ? (
                <button type="button" className={styles.tagX} aria-label={t('remove', { tag: l })} onClick={() => toggle(l)}>
                  {t('x')}
                </button>
              ) : null}
            </span>
          ))}
          {canEdit ? (
            <div className={styles.rel}>
              <button type="button" className={styles.addTag} onClick={() => ui.set({ tagFor: ui.tagFor === c.id ? null : c.id, menuFor: null })}>
                <Icon name="ic-plus" size={9} strokeWidth={2.4} />
                {t('tag')}
              </button>
              {ui.tagFor === c.id ? (
                <>
                  <div className={styles.veil} onClick={() => ui.set({ tagFor: null })} />
                  <div className={styles.pop} data-testid="tag-pop">
                    <div className={styles.popTitle}>{t('tagTitle')}</div>
                    <div className={styles.opts}>
                      {tagDefs.map((d) => {
                        const on = c.tags.includes(d.label);
                        return (
                          <button
                            key={d.label}
                            type="button"
                            aria-pressed={on}
                            className={styles.opt}
                            style={on ? { borderColor: d.line, background: d.bg, color: d.fg } : undefined}
                            onClick={() => toggle(d.label)}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
