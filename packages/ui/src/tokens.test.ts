import { describe, expect, it } from 'vitest';
import { FONT_SCALE, RADIUS_SCALE, font, radius } from './tokens';

// D41: mọi cỡ chữ / bo góc nằm trên thang đều — không có bậc lẻ kiểu 12.7 / 13.2.
describe('thang token D41', () => {
  it('mọi font.size nằm trong FONT_SCALE', () => {
    for (const [k, v] of Object.entries(font.size)) expect(FONT_SCALE, k).toContain(v);
    for (const v of Object.values(font.scale)) expect(FONT_SCALE).toContain(v);
  });
  it('mọi radius nằm trong RADIUS_SCALE', () => {
    for (const [k, v] of Object.entries(radius)) expect(RADIUS_SCALE, k).toContain(v);
  });
});
