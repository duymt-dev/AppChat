import { describe, expect, it } from 'vitest';
import { ENABLED_LOCALES, fallbackChain, resolveLocale } from './locales';
import { createFmt } from '../fmt';

describe('locales registry', () => {
  it('only vi and en are enabled', () => {
    expect(ENABLED_LOCALES).toEqual(['vi', 'en']);
  });

  it('resolves user → workspace → accept-language → vi', () => {
    expect(resolveLocale(null, 'en', 'vi')).toBe('en');
    expect(resolveLocale('ja', undefined, 'en-US')).toBe('en');
    expect(resolveLocale(undefined, null, 'fr')).toBe('vi');
  });

  it('builds fallback chains', () => {
    expect(fallbackChain('zh-HK')).toEqual(['zh-HK', 'zh-TW', 'en', 'vi']);
    expect(fallbackChain('vi')).toEqual(['vi', 'en']);
  });
});

describe('fmt', () => {
  const fmt = createFmt({ locale: 'vi' });
  it('formats VND money as prototype', () => {
    expect(fmt.money('1250000')).toBe('1.250.000₫');
  });
  it('formats compact money as prototype', () => {
    expect(fmt.moneyCompact('2450000')).toBe('2.45M₫');
    expect(fmt.moneyCompact(120000)).toBe('120k₫');
  });
  it('formats date dd/MM/yyyy in workspace timezone', () => {
    expect(fmt.date('2026-06-24T02:00:00Z')).toBe('24/06/2026');
    expect(fmt.time('2026-06-24T02:00:00Z')).toBe('09:00');
  });
});
