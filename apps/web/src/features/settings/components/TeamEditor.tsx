// Hộp nhóm (TIP-042; prototype "Tạo phòng ban" chỉ lấy phần nhóm phẳng — PD-018): tạo (tên + thành viên + trưởng nhóm → team.create),
// Cấu hình (tên / trưởng nhóm → team.update), Thành viên (thay tập → team.set_members). Trưởng nhóm chọn trong thành viên; gỡ trưởng nhóm
// khỏi nhóm bị khoá (đổi trưởng nhóm trước — server cũng từ chối lead_removed). CAS: STALE_VERSION → báo + tải lại, không ghi đè.
'use client';
import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useTeamsStyles } from '../styles/teams.styles';
import { useSettingsUi } from '../settings-store';
import { membersQuery } from '../api';
import type { TeamDraft } from '../roles.types';
import { FormModal } from './FormModal';

export function TeamEditor() {
  const t = useTranslations('settings.teams.editor');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const s = useSectionStyles().styles;
  const { styles, cx } = useTeamsStyles();
  const d = useSettingsUi((x) => x.teamEditor);
  const set = useSettingsUi((x) => x.set);
  const people = (useQuery(membersQuery('')).data?.data ?? []).filter((m) => !m.invite);
  const create = useAction('team.create');
  const update = useAction('team.update');
  const setMembers = useAction('team.set_members');
  if (!d) return null;
  const patch = (p: Partial<TeamDraft>) => set({ teamEditor: { ...d, ...p } });
  const close = () => set({ teamEditor: null });
  const toggle = (id: string) =>
    d.members.includes(id)
      ? patch({ members: d.members.filter((x) => x !== id), ...(d.lead === id ? { lead: null } : {}) })
      : patch({ members: [...d.members, id] });
  const onError = (e: { error: { code: string } }) => {
    if (e.error.code !== 'STALE_VERSION') return false;
    void message.error(t('stale'));
    void qc.invalidateQueries({ queryKey: ['teams'] });
    return true;
  };
  const save = async () => {
    if (d.mode !== 'members' && !d.name.trim()) return void message.error(t('errName'));
    const r =
      d.mode === 'create'
        ? await create.run({ name: d.name.trim(), user_ids: d.members, ...(d.lead ? { lead_user_id: d.lead } : {}) })
        : d.mode === 'config'
          ? await update.run({ team_id: d.id, if_version: d.version, name: d.name.trim(), lead_user_id: d.lead }, { onError })
          : await setMembers.run({ team_id: d.id, if_version: d.version, user_ids: d.members }, { onError });
    if (r) close();
  };
  const leadOf = d.mode === 'members' ? null : people.filter((m) => d.members.includes(m.id));
  return (
    <FormModal
      open
      title={t(`title.${d.mode}`)}
      onClose={close}
      onSave={() => void save()}
      saveLabel={d.mode === 'create' ? t('create') : t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={create.isPending || update.isPending || setMembers.isPending}
      testId="st-team-editor"
    >
      {d.mode !== 'members' ? (
        <div>
          <div className={s.label}>{t('name')}</div>
          <input className={s.input} value={d.name} maxLength={120} onChange={(e) => patch({ name: e.target.value })} placeholder={t('namePh')} data-testid="st-te-name" />
        </div>
      ) : null}
      {d.mode !== 'config' ? (
        <div>
          <div className={s.label}>{t('members', { n: d.members.length })}</div>
          <div className={styles.pick} role="group" aria-label={t('membersAria')} data-testid="st-te-members">
            {people.map((m) => {
              const locked = m.id === d.lead && d.mode === 'members';
              return (
                <label key={m.id} className={cx(styles.opt, locked && styles.optOff)} title={locked ? t('leadLocked') : undefined}>
                  <input type="checkbox" checked={d.members.includes(m.id)} disabled={locked} onChange={() => toggle(m.id)} data-user={m.id} />
                  {m.name}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      {leadOf ? (
        <div>
          <div className={s.label}>{t('lead')}</div>
          <select className={s.select} value={d.lead ?? ''} onChange={(e) => patch({ lead: e.target.value || null })} data-testid="st-te-lead">
            <option value="">{t('noLead')}</option>
            {leadOf.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className={s.muted}>{t('leadHint')}</div>
        </div>
      ) : null}
    </FormModal>
  );
}
