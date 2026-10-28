// D32 (không có trong prototype — dùng khung modal + token): người phụ trách chính + đồng phụ trách / theo dõi; duyệt yêu cầu "Xin chia sẻ".
// Thêm / gỡ: chủ của khách hoặc crm.reassign. Collaborator không chuyển phụ trách, không xoá khách.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useMe } from '@/shared/shell/useShellData';
import { useFormStyles } from '../styles/form.styles';
import { useCollabStyles } from '../styles/collab.styles';
import { useCrmUi } from '../crm-store';
import { accessRequestsQuery, collaboratorsQuery, membersQuery } from '../api';

export function CollaboratorsModal({ contactId }: { contactId: string }) {
  const t = useTranslations('customers');
  const { styles: fs, cx } = useFormStyles();
  const { styles } = useCollabStyles();
  const ui = useCrmUi();
  const me = useMe().data?.user.id;
  const data = useQuery(collaboratorsQuery(contactId)).data;
  const members = useQuery(membersQuery()).data ?? [];
  const requests = (useQuery(accessRequestsQuery()).data ?? []).filter((r) => r.contact_id === contactId);
  const add = useAction('contact.add_collaborator');
  const remove = useAction('contact.remove_collaborator');
  const decide = useAction('contact.decide_access');
  const canReassign = useCan('crm.reassign');
  const [pick, setPick] = useState('');
  const [role, setRole] = useState<'collaborator' | 'watcher'>('collaborator');
  const manage = canReassign || data?.owner.user_id === me;
  const taken = new Set([data?.owner.user_id, ...(data?.collaborators ?? []).map((c) => c.user_id)]);
  const close = () => ui.set({ modal: null, target: null });

  return (
    <ModalShell open onClose={close} width={520} title={t('collab.title')} icon="ic-users" iconColor={color.blue} iconBg={color.ruleBg} closeLabel={t('collab.close')} testId="crm-collab">
      <div className={styles.label}>{t('collab.owner')}</div>
      <div className={styles.person} data-testid="collab-owner">
        <span className={styles.av}>{data?.owner.name[0]}</span>
        <span className={styles.name}>{data?.owner.name}</span>
      </div>
      <div className={styles.label}>{t('collab.list')}</div>
      {data?.collaborators.length ? (
        data.collaborators.map((c) => (
          <div key={c.user_id} className={styles.person} data-testid="collab-row">
            <span className={styles.av}>{c.name[0]}</span>
            <span className={styles.name}>{c.name}</span>
            <span className={styles.role}>{t(c.role === 'watcher' ? 'watcher' : 'coOwner')}</span>
            {manage ? (
              <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => void remove.run({ contact_id: contactId, user_id: c.user_id })}>
                {t('collab.remove')}
              </button>
            ) : null}
          </div>
        ))
      ) : (
        <div className={styles.none}>{t('collab.none')}</div>
      )}
      {manage ? (
        <div className={fs.row}>
          <select className={cx(fs.input, fs.inputSm, styles.grow)} value={pick} aria-label={t('collab.pick')} onChange={(e) => setPick(e.target.value)} data-testid="collab-pick">
            <option value="">{t('collab.pick')}</option>
            {members.filter((m) => !taken.has(m.id)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select className={cx(fs.input, fs.inputSm, styles.roleSel)} value={role} aria-label={t('collab.role')} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="collaborator">{t('coOwner')}</option>
            <option value="watcher">{t('watcher')}</option>
          </select>
          <button
            type="button"
            className={cx(fs.btn, fs.primary)}
            disabled={!pick}
            onClick={async () => (await add.run({ contact_id: contactId, user_id: pick, role })) && setPick('')}
            data-testid="collab-add"
          >
            {t('collab.add')}
          </button>
        </div>
      ) : (
        <div className={fs.muted}>{t('collab.readOnly')}</div>
      )}
      {manage && requests.length ? (
        <>
          <div className={styles.label}>{t('collab.requests')}</div>
          {requests.map((r) => (
            <div key={r.id} className={styles.person} data-testid="access-request">
              <span className={styles.name}>{t('collab.requestRow', { name: r.requester_name })}</span>
              <button type="button" className={cx(fs.btn, fs.btnSm)} onClick={() => void decide.run({ request_id: r.id, decision: 'rejected' })}>
                {t('collab.reject')}
              </button>
              <button type="button" className={cx(fs.btn, fs.btnSm, fs.primary)} onClick={() => void decide.run({ request_id: r.id, decision: 'approved' })}>
                {t('collab.approve')}
              </button>
            </div>
          ))}
        </>
      ) : null}
    </ModalShell>
  );
}
