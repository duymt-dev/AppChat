// Menu ⋯ hội thoại có submenu (REQ-C10, ver2.1 #2) — prototype L1978–2033: Đóng · Tạm ẩn · Phím tắt · Phân công · Vòng đời ·
// Gắn thẻ nhiều — dưới đường kẻ: Lưu trữ · Ẩn trò chuyện (D50) · Tạo nhóm ("Sắp có") · Xoá lịch sử.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { membersQuery } from '@/features/customers';
import { agentsQuery } from '@/features/agents';
import { useRowStyles } from '../styles/row.styles';
import { useInboxUi, type ConvSub } from '../inbox-store';
import { cannedQuery } from '../api';
import type { Conversation } from '../types';

const STAGES = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost'] as const;
const SNOOZE = ['1h', '3h', 'tomorrow', 'custom'] as const;

export function ConvMenu({ conv, open, onClose }: { conv: Conversation; open: boolean; onClose: () => void }) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useRowStyles();
  const ui = useInboxUi();
  const sub = ui.menuFor === conv.id ? ui.convSub : null;
  const setStatus = useAction('conversation.set_status');
  const assign = useAction('conversation.assign');
  const setStage = useAction('contact.set_stage');
  const setTags = useAction('conversation.set_tags');
  const archive = useAction('conversation.archive');
  const hide = useAction('conversation.hide');
  const clear = useAction('conversation.clear_history');
  const canned = useQuery({ ...cannedQuery(), enabled: open && sub === 'shortcut' });
  const members = useQuery({ ...membersQuery(), enabled: open && sub === 'assign' });
  const agents = useQuery({ ...agentsQuery(), enabled: open && sub === 'assign' });
  const [tags, setLocalTags] = useState<string[]>(() => conv.tags.map((g) => g.label));
  const [newTag, setNewTag] = useState('');

  if (!open) return null;
  const openSub = (s: Exclude<ConvSub, null>) => ui.openConvSub(s);
  const back = () => ui.openConvSub(null as never);

  type Item = [key: string, icon: IconName, sub: ConvSub, danger: boolean, onClick?: () => void];
  // "Vòng đời" đổi giai đoạn khách — ẩn khi hội thoại không gắn khách (nhóm / chưa liên kết).
  const MAIN = ([
    ['close', 'ic-check', null, false, () => { onClose(); void setStatus.run({ conversation_id: conv.id, status: 'closed' }); }],
    ['snooze', 'ic-eye', 'hide', false],
    ['shortcut', 'ic-bolt', 'shortcut', false],
    ['assign', 'ic-users', 'assign', false],
    ['lifecycle', 'ic-flow', 'stage', false],
    ['tag', 'ic-gift', 'tags', false],
  ] satisfies Item[] as Item[]).filter(([key]) => key !== 'lifecycle' || !!conv.contact_id);
  const DIVIDER: [key: string, icon: IconName, danger: boolean, onClick: () => void][] = [
    ['archive', 'ic-inbox', false, () => { onClose(); void archive.run({ conversation_id: conv.id }); }],
    ['hideconv', 'ic-eye', false, () => { onClose(); void hide.run({ conversation_id: conv.id, hidden: true }); }],
    ['group', 'ic-users', false, () => undefined],
    ['clear', 'ic-trash', true, () => { onClose(); void clear.run({ conversation_id: conv.id }); }],
  ];

  const insertCanned = (body: string) => {
    onClose();
    ui.select(conv.id);
    ui.set({ draft: body });
  };
  const snoozeHours: Record<(typeof SNOOZE)[number], number> = { '1h': 1, '3h': 3, tomorrow: 16, custom: 24 };
  const doAssign = (id: string, isAgent: boolean) => {
    onClose();
    void assign.run({ conversation_id: conv.id, ...(isAgent ? { agent_id: id } : { user_id: id }) });
  };
  const toggleTag = (label: string) => setLocalTags((cur) => (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]));
  const addNewTag = () => {
    const v = newTag.trim();
    if (!v || tags.includes(v)) return setNewTag('');
    setLocalTags((cur) => [...cur, v]);
    setNewTag('');
  };
  const doneTags = () => {
    onClose();
    void setTags.run({ conversation_id: conv.id, tags });
  };

  return (
    <div className={cx(styles.menu)} style={{ width: sub === 'tags' ? 292 : sub ? 236 : 188 }} role="menu" data-testid="conv-menu" onClick={(e) => e.stopPropagation()}>
      {!sub ? (
        MAIN.map(([key, icon, s], i) => (
          <div key={key}>
            {MAIN[i]![2] === null && i > 0 ? <div className={styles.sep} /> : null}
            <button type="button" role="menuitem" className={styles.item} onClick={() => (s ? openSub(s) : MAIN[i]![4]?.())}>
              <Icon name={icon} size={15} color={color.text3} />
              <span className={styles.grow}>{t(`actions.${key}` as never)}</span>
              {s ? <span className={styles.caret}>{t('caret')}</span> : null}
            </button>
          </div>
        ))
      ) : (
        <>
          <div className={styles.back} onClick={back}>
            <span>{t('back')}</span>
            {t(`actions.${sub === 'hide' ? 'snooze' : sub === 'stage' ? 'lifecycle' : sub}` as never)}
          </div>
          {sub === 'hide' ? (
            <div className={styles.subList}>
              {SNOOZE.map((k) => (
                <button key={k} type="button" className={styles.item} onClick={() => { onClose(); void setStatus.run({ conversation_id: conv.id, status: 'snoozed', snooze_hours: snoozeHours[k] }); }}>
                  <span className={styles.dot} />
                  <span className={styles.grow}>{t(`snoozeOpts.${k}` as never)}</span>
                </button>
              ))}
            </div>
          ) : null}
          {sub === 'shortcut' ? (
            <div className={styles.subList}>
              {(canned.data ?? []).flatMap((g) => g.items).map(([cmd, title, body]) => (
                <button key={cmd} type="button" className={styles.item} onClick={() => insertCanned(body)}>
                  <div className={styles.grow}>
                    <div>{title}</div>
                    <div className={styles.subMeta}>{cmd}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {sub === 'assign' ? (
            <div className={styles.subList}>
              {(members.data ?? []).map((m) => (
                <button key={m.id} type="button" className={styles.item} onClick={() => doAssign(m.id, false)}>
                  <span className={styles.dot} />
                  <div className={styles.grow}>
                    <div>{m.name}</div>
                    <div className={styles.subMeta}>{t('assignHint', { role: m.role })}</div>
                  </div>
                </button>
              ))}
              {(agents.data?.data ?? []).map((a) => (
                <button key={a.id} type="button" className={styles.item} onClick={() => doAssign(a.id, true)}>
                  <span className={styles.dot} />
                  <div className={styles.grow}>
                    <div>{a.name}</div>
                    <div className={styles.subMeta}>{t('assignHint', { role: a.role_label })}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {sub === 'stage' ? (
            <div className={styles.subList}>
              {STAGES.map((s) => (
                <button key={s} type="button" className={styles.item} onClick={() => { onClose(); void setStage.run({ contact_id: conv.contact_id ?? '', stage: s }); }}>
                  <span className={styles.dot} />
                  <span className={styles.grow}>{t(`stages.${s}` as never)}</span>
                </button>
              ))}
            </div>
          ) : null}
          {sub === 'tags' ? (
            <>
              <div className={styles.tagHint}>{t('tagsHint')}</div>
              <div className={styles.tagWrap}>
                {tags.map((label) => (
                  <span key={label} className={cx(styles.tagChip, styles.tagChipOn)} onClick={() => toggleTag(label)}>
                    ✓ {label}
                  </span>
                ))}
              </div>
              <div className={styles.tagNewRow}>
                <input
                  className={styles.tagInput}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
                  placeholder={t('tagsNewPh')}
                />
                <button type="button" className={styles.tagAdd} onClick={addNewTag}>
                  {t('tagsAdd')}
                </button>
              </div>
              <button type="button" className={styles.doneBtn} onClick={doneTags}>
                {t('tagsDone', { n: tags.length })}
              </button>
            </>
          ) : null}
        </>
      )}
      {!sub ? (
        <>
          <div className={styles.sep} />
          {DIVIDER.map(([key, icon, danger, onClick]) => (
            <button key={key} type="button" role="menuitem" className={cx(styles.item, key === 'group' && styles.disabled, danger && styles.caret)} onClick={key === 'group' ? undefined : onClick}>
              <Icon name={icon} size={15} color={danger ? color.danger : color.text3} />
              <span className={styles.grow}>{t(`actions.${key}` as never)}</span>
              {key === 'group' ? <span className={styles.subMeta}>{t('comingSoon')}</span> : null}
            </button>
          ))}
        </>
      ) : null}
    </div>
  );
}
