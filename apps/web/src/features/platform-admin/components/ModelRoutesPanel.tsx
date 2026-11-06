// /admin › Định tuyến model (TIP-040, DC-370): mỗi nhóm (mức AI × mục đích) là danh sách fallback theo thứ tự (dòng đầu = chính). Lưu =
// THAY CẢ NHÓM qua admin.model_route.upsert với phiên bản nhóm (CAS) — server kiểm provider bật + đủ khả năng + model có giá.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Space } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminProvidersQuery, adminRoutesQuery } from '../api';
import { useAdminStyles } from '../styles/admin.styles';
import type { AdminRouteGroup } from '../types';

type Row = { provider_key: string; model: string };
const UP = '↑';
const DOWN = '↓';

function RouteGroup({ g, providers }: { g: AdminRouteGroup; providers: string[] }) {
  const t = useTranslations('platformAdmin.routes');
  const { styles } = useAdminStyles();
  const save = useAction('admin.model_route.upsert');
  const [rows, setRows] = useState<Row[]>(g.routes);
  const id = `${g.tier}-${g.purpose}`;
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const n = [...r];
      [n[i], n[i + d]] = [n[i + d]!, n[i]!];
      return n;
    });
  const dirty = JSON.stringify(rows) !== JSON.stringify(g.routes);
  return (
    <div className={styles.group} data-testid={`adm-route-${id}`}>
      <div className={styles.bar}>
        <strong>{`${t(`tier.${g.tier}`)} · ${t(`purpose.${g.purpose}`)}`}</strong>
        <span className={styles.grow} />
        <Button size="small" onClick={() => setRows((r) => [...r, { provider_key: providers[0] ?? '', model: '' }])} disabled={rows.length >= 10}>
          {t('add')}
        </Button>
        <Button size="small" type="primary" disabled={!dirty || rows.some((r) => !r.provider_key || !r.model.trim())} loading={save.isPending} onClick={() => void save.run({ tier: g.tier, purpose: g.purpose, if_version: g.version, routes: rows.map((r) => ({ ...r, model: r.model.trim() })) })} data-testid={`adm-route-save-${id}`}>
          {t('save')}
        </Button>
      </div>
      {!rows.length && <div className={styles.muted}>{t('empty')}</div>}
      {rows.map((r, i) => (
        <Space key={i} size={4} wrap className={styles.group}>
          <span className={styles.muted}>{i === 0 ? t('primary') : t('fallback', { n: i })}</span>
          <Select value={r.provider_key} onChange={(v) => set(i, { provider_key: v })} options={providers.map((p) => ({ value: p, label: p }))} style={{ width: 160 }} aria-label={t('provider')} />
          <Input value={r.model} onChange={(e) => set(i, { model: e.target.value })} placeholder={t('model')} aria-label={t('model')} style={{ width: 240 }} />
          <Button size="small" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('up')}>
            {UP}
          </Button>
          <Button size="small" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={t('down')}>
            {DOWN}
          </Button>
          <Button size="small" danger onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>
            {t('remove')}
          </Button>
        </Space>
      ))}
    </div>
  );
}

export function ModelRoutesPanel() {
  const { styles } = useAdminStyles();
  const q = useQuery(adminRoutesQuery());
  const pq = useQuery(adminProvidersQuery());
  const providers = (pq.data ?? []).filter((p) => p.status === 'active').map((p) => p.key);
  return (
    <div className={styles.card}>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {(q.data ?? []).map((g) => (
          <RouteGroup key={`${g.tier}-${g.purpose}-${g.version}`} g={g} providers={providers} />
        ))}
      </PageStates>
    </div>
  );
}
