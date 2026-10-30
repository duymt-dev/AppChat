// TIP-001 AC7: worker dựng được application context theo ROLE, mỗi domain thuộc đúng một role, ROLE sai → lỗi.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { CLOCK, DOMAINS } from '@appchat/core';
import { AI_JOBS } from '../src/roles/ai.module';
import { CHANNELS_JOBS } from '../src/roles/channels.module';
import { JOBS_JOBS } from '../src/roles/jobs.module';
import { WorkerModule, roleModules } from '../src/worker.module';

const pascal = (d: string) => `${d[0]!.toUpperCase()}${d.slice(1)}JobsModule`;

describe('worker roles', () => {
  it('mỗi domain có JobsModule ở đúng một role (hàng đợi Blueprint §1.3)', () => {
    const all = [...CHANNELS_JOBS, ...AI_JOBS, ...JOBS_JOBS].map((m) => m.name);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(DOMAINS.map(pascal).sort());
    expect(CHANNELS_JOBS.map((m) => m.name)).toEqual(['ChannelsJobsModule', 'InboxJobsModule', 'MarketingJobsModule']);
    expect(AI_JOBS.map((m) => m.name)).toEqual(['AiJobsModule']);
  });

  it.each(['channels', 'ai', 'jobs', 'all'])('ROLE=%s dựng được context, có kernel', async (role) => {
    const app = await NestFactory.createApplicationContext(WorkerModule.forRole(role), { logger: false });
    expect(app.get(CLOCK).now()).toBeInstanceOf(Date);
    await app.close();
  });

  it('ROLE=all gộp 3 role; ROLE lạ → lỗi', () => {
    expect(roleModules('all')).toHaveLength(3);
    expect(() => roleModules('foo')).toThrow(/ROLE/);
  });
});
