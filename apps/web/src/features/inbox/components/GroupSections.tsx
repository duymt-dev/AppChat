// Phần dưới của "Thông tin nhóm": Bảng tin · Ảnh/Video · File · Link · AI trong nhóm · ẩn / xoá lịch sử / rời nhóm — prototype L1941–2008.
'use client';
import { useState } from 'react';
import type { GroupStateDto } from '@appchat/shared';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useGroupStyles } from '../styles/group.styles';
import type { Conversation, GroupInfo } from '../types';

const EXT: Record<string, string> = { PDF: color.dangerStrong, XLSX: color.okStrong, DOCX: color.blue };
const POLICIES = ['mention', 'auto', 'off'] as const;

function Fold({ title, meta, open, onToggle, children }: { title: string; meta?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const t = useTranslations('inbox.group');
  const { styles } = useGroupStyles();
  return (
    <>
      <div className={styles.gap} />
      <div className={styles.block}>
        <button type="button" className={styles.foldHead} onClick={onToggle} aria-expanded={open}>
          <span className={styles.title}>{title}</span>
          {meta ? <span className={styles.foldMeta}>{meta}</span> : null}
          <span className={styles.caret}>{t(open ? 'caretOpen' : 'caretClosed')}</span>
        </button>
        {open ? children : null}
      </div>
    </>
  );
}

export interface GroupSectionsProps {
  conv: Conversation;
  g: GroupInfo;
  /** TIP-025b: trạng thái nhóm (chính sách + phiên bản); chưa tải → chỉ hiện chính sách cũ, không cho đổi. */
  state?: GroupStateDto;
  onPolicy: (p: (typeof POLICIES)[number], version: number) => Promise<boolean>;
}

export function GroupSections({ conv, g, state, onPolicy }: GroupSectionsProps) {
  const t = useTranslations('inbox.group');
  const { styles, cx } = useGroupStyles();
  const clear = useAction('conversation.clear_history');
  const hide = useAction('conversation.hide');
  const [open, setOpen] = useState({ media: true, files: true, links: true, ai: false });
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  // Chính sách lưu thật (TIP-025b §A.2): đọc từ trạng thái nhóm, ghi qua group.set_ai_policy (CAS) — không giữ state cục bộ.
  const policy = state?.policy ?? g.ai_policy;

  return (
    <>
      <div className={styles.gap} />
      <div className={styles.block}>
        <div className={styles.boardTitle}>{t('board')}</div>
        <button type="button" className={styles.row}>
          <Icon name="ic-pin" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('pinned')}</div>
            <div className={styles.sub}>{g.pinned_sub}</div>
          </div>
        </button>
        <button type="button" className={styles.row}>
          <Icon name="ic-doc" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('notes')}</div>
            <div className={styles.sub}>{t('notesSub')}</div>
          </div>
        </button>
      </div>
      <Fold title={t('media')} meta={t('mediaCount', { n: g.media.length })} open={open.media} onToggle={() => toggle('media')}>
        <div className={styles.media}>
          {g.media.map(([title, hue, label]) => (
            // gradient theo màu ảnh (dữ liệu) — giá trị động
            <div key={title} title={title} className={styles.tile} style={{ background: `linear-gradient(135deg,hsl(${hue} 45% 62%),hsl(${hue} 40% 46%))` }}>
              {label}
            </div>
          ))}
        </div>
        <div className={styles.seeAllWrap}>
          <button type="button" className={styles.seeAll}>
            {t('seeAll')}
          </button>
        </div>
      </Fold>
      <Fold title={t('files')} open={open.files} onToggle={() => toggle('files')}>
        {g.files.map(([ext, n, meta]) => (
          <div key={n} className={styles.row}>
            <div className={styles.ext} style={{ background: EXT[ext] ?? color.text3 }}>
              {ext}
            </div>
            <div className={styles.grow}>
              <div className={styles.label}>{n}</div>
              <div className={styles.sub}>{meta}</div>
            </div>
          </div>
        ))}
        <div className={styles.seeAllWrap}>
          <button type="button" className={styles.seeAll}>
            {t('seeAll')}
          </button>
        </div>
      </Fold>
      <Fold title={t('links')} open={open.links} onToggle={() => toggle('links')}>
        {g.links.map(([title, url]) => (
          <div key={url} className={styles.row}>
            <span className={styles.linkIcon}>
              <Icon name="ic-globe" size={16} color={color.groupSub} />
            </span>
            <div className={styles.grow}>
              <div className={styles.label}>{title}</div>
              <div className={styles.link}>{url}</div>
            </div>
          </div>
        ))}
      </Fold>
      <Fold title={t('ai.title')} open={open.ai} onToggle={() => toggle('ai')}>
        <div className={styles.seg} role="radiogroup" data-testid="group-ai">
          {POLICIES.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={policy === k} className={cx(styles.segBtn, policy === k && styles.segOn)} disabled={!state || policy === k} onClick={() => state && void onPolicy(k, state.policy_version)} data-testid={`group-ai-${k}`}>
              {t(`ai.${k}`)}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <Icon name="ic-shield" size={18} color={color.groupInk} />
          <div className={styles.grow}>
            <div className={styles.label}>{t('ai.rules')}</div>
            <div className={styles.sub}>{t('ai.rulesSub')}</div>
          </div>
        </div>
      </Fold>
      <div className={styles.gap} />
      <div className={styles.block}>
        <button type="button" className={styles.row} onClick={() => void hide.run({ conversation_id: conv.id, hidden: true })}>
          <Icon name="ic-eye" size={18} color={color.groupInk} />
          <span className={styles.label}>{t('hide')}</span>
        </button>
        <button type="button" className={styles.row} onClick={() => void clear.run({ conversation_id: conv.id })}>
          <Icon name="ic-trash" size={18} color={color.danger} />
          <span className={cx(styles.label, styles.danger)}>{t('clear')}</span>
        </button>
      </div>
    </>
  );
}
