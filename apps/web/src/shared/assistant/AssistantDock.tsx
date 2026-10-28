// Trợ lý thu nhỏ (panel phải) — theo bản thu nhỏ của prototype (L2938–2980, "Phiên bản thu nhỏ").
// F0: khung + greeting; luồng hội thoại kịch bản mock gắn ở F3 (assistant:*).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { Icon, color, font, gradient, layout, radius, shadow, z } from '@appchat/ui';
import { useShellStore } from '../shell/shell-store';

const useStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.veil};
    z-index: ${z.dockVeil};
  `,
  panel: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${layout.dockW}px;
    max-width: 100%;
    z-index: ${z.dock};
    background: ${color.surface};
    box-shadow: ${shadow.sidePanel};
    display: flex;
    flex-direction: column;
    ${responsive.md} {
      width: 100%;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 16px 18px;
    border-bottom: 1px solid ${color.divider};
    background: ${gradient.aiSoft};
  `,
  mark: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.md}px;
    background: ${gradient.upgrade};
    display: grid;
    place-items: center;
  `,
  title: css`
    font-size: ${font.size.upgrade}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.size.small}px;
    color: ${color.tealInk};
    font-weight: ${font.weight.semibold};
  `,
  grow: css`
    flex: 1;
  `,
  close: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.sm}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    font-size: ${font.size.h3}px;
    background: none;
    border: none;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
  `,
  bubble: css`
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    & > span {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: ${color.text};
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    & > div {
      background: ${color.bg};
      border: 1px solid ${color.divider};
      border-radius: ${radius.lg}px;
      padding: 11px 13px;
      font-size: ${font.size.body}px;
      color: ${color.text2};
      line-height: 1.55;
    }
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    display: flex;
    flex-direction: column;
    gap: 9px;
  `,
  input: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.lg}px;
    padding: 8px 8px 8px 13px;
    & input {
      flex: 1;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: ${font.size.body}px;
      color: ${color.text};
      background: transparent;
    }
    & button {
      width: 34px;
      height: 34px;
      border: none;
      border-radius: 9px;
      background: ${color.brand};
      display: grid;
      place-items: center;
      cursor: pointer;
    }
  `,
  full: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 13.2px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    padding: 2px;
  `,
}));

export function AssistantDock() {
  const t = useTranslations('shell.dock');
  const tc = useTranslations('common');
  const router = useRouter();
  const { styles } = useStyles();
  const open = useShellStore((s) => s.dockOpen);
  const setDock = useShellStore((s) => s.setDock);
  if (!open) return null;
  return (
    <>
      <div className={styles.veil} onClick={() => setDock(false)} />
      <aside className={styles.panel} data-testid="assistant-dock">
        <div className={styles.head}>
          <span className={styles.mark}>
            <Icon name="ic-spark" size={layout.iconSm} color={color.white} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.sub}>{t('subtitle')}</div>
          </div>
          <button type="button" className={styles.close} onClick={() => setDock(false)} aria-label={tc('close')}>
            <Icon name="ic-x" size={18} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.bubble}>
            <span>
              <Icon name="ic-spark" size={15} color={color.white} strokeWidth={1.9} />
            </span>
            <div>{t('greeting')}</div>
          </div>
        </div>
        <div className={styles.foot}>
          <div className={styles.input}>
            <input placeholder={t('placeholder')} />
            <button type="button" aria-label={t('send')}>
              <Icon name="ic-send" size={15} color={color.white} />
            </button>
          </div>
          <div
            className={styles.full}
            onClick={() => {
              setDock(false);
              router.push('/assistant');
            }}
          >
            <Icon name="ic-spark" size={14} />
            {t('openFull')}
          </div>
        </div>
      </aside>
    </>
  );
}
