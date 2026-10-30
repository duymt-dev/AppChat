import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AGENT_GRANTABLE } from './agent-tools';

// Builder AI Agents / menu ＋ tra tên tool bằng `title` gốc của action, mô tả cho người dùng bằng `<id>.desc`
// (`description` của action là tiếng Anh cho LLM, không hiển thị) — thiếu key là hàng tool hiện mã thô.
describe.each(['vi', 'en'])('tên tool agent (%s)', (locale) => {
  const msgs: Record<string, unknown> = {};
  for (const f of fs.readdirSync(`messages/${locale}`)) msgs[f.replace('.json', '')] = JSON.parse(fs.readFileSync(`messages/${locale}/${f}`, 'utf8'));
  const resolve = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], msgs);

  it('mọi action agentGrantable có tiêu đề', () => {
    expect(AGENT_GRANTABLE.filter((a) => typeof resolve(a.title) !== 'string').map((a) => a.title)).toEqual([]);
  });

  it('mọi action agentGrantable có mô tả cho người dùng', () => {
    const key = (t: string) => t.replace(/\.title$/, '.desc');
    expect(AGENT_GRANTABLE.filter((a) => typeof resolve(key(a.title)) !== 'string').map((a) => key(a.title))).toEqual([]);
  });
});
