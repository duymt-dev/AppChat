// Modal "Tạo ticket mới" — prototype L3247–3274 (540px, lưới 2 cột): Tiêu đề * · Khách hàng · Email · Kênh · Danh mục · Ưu tiên · Trạng thái ·
// Nhóm xử lý · Người phụ trách (nhân viên hoặc AI Agent) · Mô tả (thanh định dạng). Kênh theo channel registry (Zalo cá nhân · Web chat · Email).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useTkFormStyles } from '../styles/form.styles';
import { useTicketsUi } from '../tickets-store';
import { PRIORITIES, STATUSES } from '../status';
import type { Channel, Priority, TicketsMeta } from '../types';
import { CustomFieldInputs, useCustomDraft } from '@/shared/custom-fields';
import { sourceLinkOf } from '@/shared/crm-forms/source-link';

const CHANNELS: Channel[] = ['zalo_personal', 'webchat', 'email'];
const OPEN_STATUSES = STATUSES.filter((s) => s !== 'closed');
const TOOLS = [
  ['B', 'bold', '**'],
  ['I', 'italic', '_'],
  ['U', 'underline', '__'],
  ['•', 'ul', '\n• '],
  ['1.', 'ol', '\n1. '],
] as const;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown) => (typeof v === 'string' ? v : '');

function Select({ value, onPick, opts, testId }: { value: string; onPick: (v: string) => void; opts: [string, string][]; testId: string }) {
  const { styles } = useTkFormStyles();
  return (
    <select className={styles.select} value={value} onChange={(e) => onPick(e.target.value)} data-testid={testId}>
      {opts.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function TicketFormModal({ meta }: { meta: TicketsMeta }) {
  const open = useTicketsUi((s) => s.form);
  const prefill = useTicketsUi((s) => s.prefill);
  if (!open) return null;
  return <TicketForm key={JSON.stringify(prefill)} meta={meta} prefill={prefill ?? {}} />;
}

function TicketForm({ meta, prefill }: { meta: TicketsMeta; prefill: Record<string, unknown> }) {
  const t = useTranslations('tickets');
  const { styles, cx } = useTkFormStyles();
  const set = useTicketsUi((s) => s.set);
  const create = useAction<{ ticket_id: string; merged?: boolean }>('ticket.create');
  const { modal } = App.useApp();
  const [d, setD] = useState({
    title: str(prefill.title),
    company: str(prefill.company),
    email: str(prefill.email),
    channel: (str(prefill.channel) || 'zalo_personal') as Channel,
    category: str(prefill.category) || meta.categories[0]!,
    priority: (str(prefill.priority) || 'high') as Priority,
    status: (str(prefill.status) || 'open') as 'open' | 'in_progress' | 'waiting',
    team_id: str(prefill.team_id) || (meta.teams[0]?.id ?? ''),
    owner: str(prefill.assignee_user_id) || (meta.members[2] ?? meta.members[0])!.id,
    description: str(prefill.description),
  });
  const [err, setErr] = useState('');
  const cf = useCustomDraft('ticket');
  const up = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((s) => ({ ...s, [k]: v }));
  const close = () => set({ form: false, prefill: null });
  const save = async () => {
    if (!d.title.trim()) return setErr(t('form.required'));
    if (d.email && !EMAIL.test(d.email)) return setErr(t('form.emailBad'));
    const agent = d.owner === meta.agent.id;
    const c = cf.collect('create');
    if (!c.ok) return;
    const input = {
      title: d.title.trim(),
      ...(d.company.trim() ? { company: d.company.trim() } : {}),
      ...(d.email ? { email: d.email } : {}),
      ...(str(prefill.contact_id) ? { contact_id: str(prefill.contact_id) } : {}),
      ...sourceLinkOf(prefill),
      channel: d.channel,
      category: d.category,
      priority: d.priority,
      status: d.status,
      ...(agent ? { assignee_agent_id: d.owner } : { assignee_user_id: d.owner, ...(d.team_id ? { team_id: d.team_id } : {}) }),
      ...(d.description.trim() ? { description: d.description.trim() } : {}),
      ...(c.custom ? { custom: c.custom } : {}),
    };
    // REQ-H02: khách đã có ticket còn mở cùng danh mục trong 24 giờ → hỏi gộp vào ticket cũ hay vẫn tạo mới.
    const send = (on_duplicate?: 'merge' | 'create') =>
      create.run({ ...input, ...(on_duplicate ? { on_duplicate } : {}) }, {
        onError: (e) => {
          const dup = (e.error.fields as Record<string, string> | undefined)?.duplicate_of;
          if (e.error.code !== 'CONFLICT' || !dup) return cf.absorb(e.error.fields);
          modal.confirm({
            title: t('form.dupTitle', { code: dup }),
            content: t('form.dupHint'),
            okText: t('form.dupMerge'),
            cancelText: t('form.dupNew'),
            onOk: () => void send('merge').then(done),
            onCancel: () => void send('create').then(done),
          });
          return true;
        },
      });
    const done = (r: Awaited<ReturnType<typeof send>>) => {
      if (r) set({ form: false, prefill: null, detail: r.result.ticket_id, tab: 'detail' });
    };
    done(await send());

  };
  const field = (label: string, el: React.ReactNode, full?: boolean) => (
    <div className={full ? styles.full : undefined}>
      <label className={styles.label}>{label}</label>
      {el}
    </div>
  );
  return (
    <ModalShell
      open
      onClose={close}
      width={540}
      dense
      title={t('form.title')}
      icon="ic-ticket"
      iconColor={color.brandInk}
      iconBg={color.brandBg}
      closeLabel={t('form.close')}
      testId="tk-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} onClick={() => void save()} data-testid="tk-save">
            {t('form.save')}
          </button>
        </>
      }
    >
      <div className={styles.two}>
        {err ? (
          <div className={cx(styles.err, styles.full)} data-testid="tk-form-err">
            {err}
          </div>
        ) : null}
        {field(
          t('form.titleL'),
          <input className={styles.input} placeholder={t('form.titlePh')} value={d.title} onChange={(e) => up('title', e.target.value)} data-testid="tk-title" />,
          true,
        )}
        {field(
          t('form.company'),
          <input className={styles.input} placeholder={t('form.companyPh')} value={d.company} onChange={(e) => up('company', e.target.value)} data-testid="tk-company" />,
        )}
        {field(
          t('form.email'),
          <input className={styles.input} placeholder={t('form.emailPh')} value={d.email} onChange={(e) => up('email', e.target.value)} data-testid="tk-email" />,
        )}
        {field(t('form.channel'), <Select value={d.channel} onPick={(v) => up('channel', v as Channel)} opts={CHANNELS.map((c) => [c, t(`channel.${c}`)])} testId="tk-channel" />)}
        {field(t('form.category'), <Select value={d.category} onPick={(v) => up('category', v)} opts={meta.categories.map((c) => [c, c])} testId="tk-category" />)}
        {field(t('form.priority'), <Select value={d.priority} onPick={(v) => up('priority', v as Priority)} opts={PRIORITIES.map((p) => [p, t(`priority.${p}`)])} testId="tk-priority" />)}
        {field(
          t('form.status'),
          <Select value={d.status} onPick={(v) => up('status', v as typeof d.status)} opts={OPEN_STATUSES.map((s) => [s, t(`status.${s}`)])} testId="tk-status-sel" />,
        )}
        {field(t('form.team'), <Select value={d.team_id} onPick={(v) => up('team_id', v)} opts={meta.teams.map((x) => [x.id, x.name])} testId="tk-team" />)}
        {field(
          t('form.owner'),
          <Select
            value={d.owner}
            onPick={(v) => up('owner', v)}
            opts={[...meta.members.map((m): [string, string] => [m.id, m.name]), [meta.agent.id, meta.agent.name]]}
            testId="tk-owner-sel"
          />,
        )}
        <div className={styles.full}>
          <label className={styles.label}>{t('form.desc')}</label>
          <div className={styles.rt}>
            <div className={styles.rtBar}>
              {TOOLS.map(([l, k, mark]) => (
                <button
                  key={k}
                  type="button"
                  title={t(`form.tools.${k}`)}
                  aria-label={t(`form.tools.${k}`)}
                  onClick={() => up('description', d.description + mark)}
                >
                  {l}
                </button>
              ))}
            </div>
            <textarea
              className={styles.rtArea}
              value={d.description}
              onChange={(e) => up('description', e.target.value)}
              data-testid="tk-desc"
            />
          </div>
          <div className={styles.hint}>{t('form.descHint')}</div>
        </div>
      </div>
      <CustomFieldInputs draft={cf} />
    </ModalShell>
  );
}
