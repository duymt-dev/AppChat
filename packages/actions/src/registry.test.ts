import { describe, expect, it } from 'vitest';
import { registry } from './index';

describe('action registry contract', () => {
  it('has unique ids in <domain>.<verb> form', () => {
    const ids = registry.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
  });

  it('every action declares description, title key and invalidates', () => {
    for (const a of registry) {
      expect(a.description.length).toBeGreaterThan(10);
      expect(a.title).toBe(`actions.${a.id}.title`);
      expect(Array.isArray(a.invalidates)).toBe(true);
    }
  });

  it('input schemas reject garbage', () => {
    for (const a of registry) expect(a.input.safeParse(42).success).toBe(false);
  });
});
