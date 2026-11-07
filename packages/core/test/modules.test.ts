// TIP-001 AC8: core/index.ts export đủ 19 domain module + JobsModule; mỗi domain có thư mục + file đúng layout Blueprint §1.2.
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as core from '../src';

const pascal = (d: string) => d[0]!.toUpperCase() + d.slice(1);
const SRC = join(import.meta.dirname, '..', 'src');

describe('core modules', () => {
  it('19 domain theo Blueprint §1.2', () => {
    expect(core.DOMAINS).toHaveLength(19);
    expect(new Set(core.DOMAINS).size).toBe(19);
  });

  it.each(core.DOMAINS)('%s: export <Domain>Module + <Domain>JobsModule, file đúng chỗ', (d) => {
    const ex = core as unknown as Record<string, unknown>;
    expect(typeof ex[`${pascal(d)}Module`]).toBe('function');
    expect(typeof ex[`${pascal(d)}JobsModule`]).toBe('function');
    expect(existsSync(join(SRC, d, `${d}.module.ts`))).toBe(true);
    expect(existsSync(join(SRC, d, 'jobs', `${d}.jobs.module.ts`))).toBe(true);
  });

  it('KernelModule là global và cung cấp CLOCK + LOGGER', () => {
    expect(Reflect.getMetadata('__module:global__', core.KernelModule)).toBe(true);
    expect(Reflect.getMetadata('exports', core.KernelModule)).toEqual([core.CLOCK, core.LOGGER]);
  });
});
