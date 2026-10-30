import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AGENT_GRANTABLE } from './agent-tools';

// Builder AI Agents / menu ＋ tra tên tool bằng `title` gốc của action — thiếu key là hàng tool hiện mã thô.
describe.each(['vi', 'en'])('tên tool agent (%s)', (locale) => {
  const msgs: Record<string, unknown> = {};
  for (const f of fs.readdirSync(`messages/${locale}`)) msgs[f.replace('.json', '')] = JSON.parse(fs.readFileSync(`messages/${locale}/${f}`, 'utf8'));
  const resolve = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], msgs);

  it('mọi action agentGrantable có tiêu đề', () => {
    expect(AGENT_GRANTABLE.filter((a) => typeof resolve(a.title) !== 'string').map((a) => a.title)).toEqual([]);
  });
});
