// Hộp Tuỳ chỉnh Hồ sơ 360° (REQ-F12) — prototype L690–735: đổi mẫu, bật/tắt · đổi tên · đổi thứ tự · xoá tab (khôi phục được),
// thêm tab mới từ thư viện 12 khối. Mở từ Cài đặt → Hồ sơ 360° và từ nút ⚙ trên Panel360 (Hộp thư) — dùng chung qua index.ts.
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useProfileLayoutDraft } from '../hooks/useProfileLayoutDraft';
import { useProfileLayoutUi } from '../profile-layout-store';
import { useProfileLayoutEditorStyles } from '../styles/profile-layout-editor.styles';
import { useProfileLayoutCommonStyles } from '../styles/profile-layout-common.styles';
import { profileLayoutsQuery } from '../api';
import type { LayoutTab, ProfileLayout } from '../types';

const BLOCK_KEYS = ['contact', 'fields', 'ticket', 'sla', 'csat', 'careNote', 'quotes', 'orders', 'appts', 'loyalty', 'signals', 'summary'] as const;
const BUILTIN_RESTORE: [string, string][] = [
  ['overview', 'Tổng quan'],
  ['crm', 'CRM'],
  ['ai', 'AI'],
  ['files', 'Tệp'],
  ['history', 'Lịch sử'],
];
const DEFAULT_TABS = (): LayoutTab[] =>
  BUILTIN_RESTORE.map(([key, label], sort) => ({ key, label, enabled: true, sort, builtin: true, blocks: [] }));

function reorder(tabs: LayoutTab[], i: number, dir: -1 | 1): LayoutTab[] {
  const j = i + dir;
  if (j < 0 || j >= tabs.length) return tabs;
  const next = tabs.slice();
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next.map((t, idx) => ({ ...t, sort: idx }));
}

export function ProfileLayoutEditor() {
  const editId = useProfileLayoutUi((s) => s.editId);
  const q = useQuery(profileLayoutsQuery());
  const close = useProfileLayoutUi((s) => s.close);
  if (!editId || !q.data) return null;
  const tpl = q.data.layouts.find((l) => l.id === editId);
  if (!tpl) return null;
  return <Editor key={tpl.id} tpl={tpl} opts={q.data.layouts} onClose={close} />;
}

function Editor({ tpl, opts, onClose }: { tpl: ProfileLayout; opts: ProfileLayout[]; onClose: () => void }) {
  const t = useTranslations('settings.profile360.editor');
  const tb = useTranslations('settings.profile360.blocks');
  const tp = useTranslations('settings.profile360');
  const { message } = App.useApp();
  const { styles, cx } = useProfileLayoutEditorStyles();
  const { styles: c } = useProfileLayoutCommonStyles();
  const open = useProfileLayoutUi((s) => s.open);
  const adding = useProfileLayoutUi((s) => s.adding);
  const setAdding = useProfileLayoutUi((s) => s.setAdding);
  // TIP-026b §4.6: ghi tuần tự + CAS qua bản nháp (không bắn patch mỗi phím, không báo xong trước khi server xác nhận).
  const draft = useProfileLayoutDraft(tpl.id, tpl.tabs, tpl.version);
  const qc = useQueryClient();
  const tabs = draft.tabs;
  const commit = (next: typeof tabs) => draft.edit(next);
  const close = () => {
    if (draft.busy() && !window.confirm(t('pendingClose'))) return;
    onClose();
  };
  const reload = () => {
    void qc.invalidateQueries({ queryKey: ['profile_layouts'] });
    onClose();
  };
  const overwrite = async () => {
    const fresh = (await qc.fetchQuery({ ...profileLayoutsQuery(), staleTime: 0 })).layouts.find((l) => l.id === tpl.id);
    draft.rebase(fresh?.version);
  };

  const flip = (i: number) => {
    const visible = tabs.filter((x) => x.enabled).length;
    if (tabs[i]!.enabled && visible <= 1) return message.warning(t('minOneTabFlip'));
    commit(tabs.map((x, idx) => (idx === i ? { ...x, enabled: !x.enabled } : x)));
  };
  const rename = (i: number, label: string) => commit(tabs.map((x, idx) => (idx === i ? { ...x, label } : x)));
  const move = (i: number, dir: -1 | 1) => commit(reorder(tabs, i, dir));
  const del = (i: number) => {
    if (tabs.length <= 1) return message.warning(t('minOneTabDel'));
    const tab = tabs[i]!;
    if (tab.builtin && !window.confirm(t('delBuiltinConfirm', { name: tab.label }))) return;
    commit(tabs.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, sort: idx })));
  };
  const flipBlock = (i: number, key: string) => {
    const blocks = tabs[i]!.blocks.includes(key) ? tabs[i]!.blocks.filter((b) => b !== key) : [...tabs[i]!.blocks, key];
    commit(tabs.map((x, idx) => (idx === i ? { ...x, blocks } : x)));
  };
  const restore = (key: string, label: string) =>
    commit([...tabs, { key, label, enabled: true, sort: tabs.length, builtin: true, blocks: [] }]);
  const reset = () => {
    if (!window.confirm(t('resetConfirm'))) return;
    commit(DEFAULT_TABS());
  };
  const saveNewTab = () => {
    if (!adding || !adding.name.trim()) return;
    const name = adding.name.trim();
    commit([...tabs, { key: `c${Date.now()}`, label: name, enabled: true, sort: tabs.length, builtin: false, blocks: adding.blocks }]);
    setAdding(null);
  };

  const tr = useTranslations('settings.roleName');
  const missing = BUILTIN_RESTORE.filter(([k]) => !tabs.find((x) => x.key === k));
  const roles = tpl.roles.length ? tpl.roles.map((r) => tr(r)).join(', ') : tp('roleNone');

  return (
    <ModalShell
      open
      onClose={close}
      width={620}
      title={t('title')}
      icon="ic-panel"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="pl-editor"
      footer={
        <>
          <button type="button" className={c.ghostBtn} onClick={reset}>
            {t('reset')}
          </button>
          <span className={styles.status} data-testid="pl-editor-status">
            {draft.status === 'saving' ? t('saving') : draft.status === 'saved' ? t('saved') : draft.status === 'error' ? t('saveError') : ''}
          </span>
          <button type="button" className={c.primaryBtn} onClick={close} data-testid="pl-editor-done">
            {t('done')}
          </button>
        </>
      }
    >
      {draft.status === 'conflict' ? (
        <div className={styles.conflict} data-testid="pl-editor-conflict">
          <span>{t('conflict')}</span>
          <button type="button" className={c.ghostBtn} onClick={reload}>
            {t('conflictReload')}
          </button>
          <button type="button" className={c.primaryBtn} onClick={() => void overwrite()}>
            {t('conflictOverwrite')}
          </button>
        </div>
      ) : null}
      <div className={styles.subT}>{t('sub', { roles })}</div>
      <select
        className={cx(c.select, c.mt8)}
        value={tpl.id}
        onChange={(e) => open(e.target.value)}
        aria-label={t('template')}
        data-testid="pl-editor-tpl"
      >
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <div className={cx(styles.sectionT, c.mt16)}>{t('tabsHead')}</div>
      <div className={cx(c.gap8, c.mt8)}>
        {tabs.map((tab, i) => (
          <div key={tab.key} className={styles.tabRow} data-testid={`pl-tab-${tab.key}`}>
            <div className={styles.tabRowHead}>
              <button type="button" role="switch" aria-checked={tab.enabled} onClick={() => flip(i)} className={styles.iconBtn} aria-label={tab.label}>
                <Icon name={tab.enabled ? 'ic-check' : 'ic-x'} size={13} color={tab.enabled ? color.brandInk : color.text4} />
              </button>
              <input className={styles.tabInput} value={tab.label} onChange={(e) => rename(i, e.target.value)} />
              <span className={cx(styles.badge, tab.builtin ? styles.badgeBuiltin : styles.badgeCustom)}>
                {tab.builtin ? t('builtin') : t('custom')}
              </span>
              <button type="button" className={styles.iconBtn} onClick={() => move(i, -1)} aria-label={t('up')}>
                <Icon name="ic-up" size={13} color={color.text3} />
              </button>
              <button type="button" className={styles.iconBtn} onClick={() => move(i, 1)} aria-label={t('down')}>
                <Icon name="ic-down" size={13} color={color.text3} />
              </button>
              <button type="button" className={cx(styles.iconBtn, styles.iconBtnDanger)} onClick={() => del(i)} aria-label={t('delTab')}>
                <Icon name="ic-trash" size={13} color={color.dangerDeep} />
              </button>
            </div>
            <div className={styles.blocksBox}>
              <div className={styles.blocksHint}>{tab.builtin ? t('blocksExtra') : t('blocksOfTab')}</div>
              <div className={styles.chipRow}>
                {BLOCK_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={cx(c.chip, tab.blocks.includes(k) && c.chipOn)}
                    onClick={() => flipBlock(i, k)}
                  >
                    {tb(k)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {missing.length ? (
        <div className={cx(styles.restoreBox, c.mt8)}>
          <span className={styles.restoreHint}>{t('restoreHint')}</span>
          {missing.map(([k, l]) => (
            <button key={k} type="button" className={styles.restoreChip} onClick={() => restore(k, l)}>
              {t('restoreAdd', { name: l })}
            </button>
          ))}
        </div>
      ) : null}
      {adding ? (
        <div className={cx(styles.addBox, c.mt8)}>
          <div className={styles.addT}>{t('addTitle')}</div>
          <input
            className={styles.tabInput}
            value={adding.name}
            onChange={(e) => setAdding({ ...adding, name: e.target.value })}
            placeholder={t('namePh')}
            data-testid="pl-add-name"
          />
          <div className={styles.addFootHint}>{t('pickBlocks')}</div>
          <div className={styles.chipRow}>
            {BLOCK_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={cx(c.chip, adding.blocks.includes(k) && c.chipOn)}
                onClick={() => setAdding({ ...adding, blocks: adding.blocks.includes(k) ? adding.blocks.filter((b) => b !== k) : [...adding.blocks, k] })}
              >
                {tb(k)}
              </button>
            ))}
          </div>
          <div className={styles.addFoot}>
            <button type="button" className={c.ghostBtn} onClick={() => setAdding(null)}>
              {t('addCancel')}
            </button>
            <button type="button" className={c.primaryBtn} disabled={!adding.name.trim()} onClick={saveNewTab} data-testid="pl-add-save">
              {t('addSave')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={cx(styles.addOpen, c.mt8)} onClick={() => setAdding({ name: '', blocks: [] })} data-testid="pl-add-open">
          {t('addNew')}
        </button>
      )}
    </ModalShell>
  );
}
