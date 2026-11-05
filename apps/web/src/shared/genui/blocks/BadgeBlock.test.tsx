// Khối badge: chữ + tone → (chữ, nền) token; tone vắng = default.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { color } from '@appchat/ui';
import { part, renderUi } from './test-utils';

const rgb = (h: string) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;

describe('BadgeBlock', () => {
  it('tone warning → token warn / warnBg', () => {
    renderUi(part({ type: 'badge', text: 'Sắp hết hạn', tone: 'warning' }));
    const b = screen.getByTestId('genui-badge');
    expect(b.textContent).toBe('Sắp hết hạn');
    expect(b.style.color).toBe(rgb(color.warn));
    expect(b.style.background).toBe(rgb(color.warnBg));
  });

  it('không tone → default', () => {
    renderUi(part({ type: 'badge', text: 'VIP' }));
    expect(screen.getByTestId('genui-badge').style.color).toBe(rgb(color.text2));
  });
});
