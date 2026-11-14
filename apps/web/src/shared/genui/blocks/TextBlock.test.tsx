// Khối text: văn bản thuần (HTML / markdown hiện nguyên chữ, không dựng thẻ); tone → màu token.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { color } from '@appchat/ui';
import { part, renderUi } from './test-utils';

describe('TextBlock', () => {
  it('hiện chữ thuần, không diễn giải HTML', () => {
    const { container } = renderUi(part({ type: 'text', text: '<img src=x onerror=alert(1)> **đậm**' }));
    expect(screen.getByTestId('genui-text').textContent).toBe('<img src=x onerror=alert(1)> **đậm**');
    expect(container.querySelector('img')).toBeNull();
  });

  it('tone danger → màu token', () => {
    renderUi(part({ type: 'text', text: 'Cảnh báo', tone: 'danger' }));
    expect(screen.getByTestId('genui-text').style.color).toBe(hex(color.danger));
  });
});

/** #E33F3F → rgb(227, 63, 63) như jsdom trả. */
const hex = (h: string) => `rgb(${[1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ')})`;
