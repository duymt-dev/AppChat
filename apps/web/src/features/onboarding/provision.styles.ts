import { createStyles, keyframes } from 'antd-style';
import { color, font } from '@appchat/ui';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const useProvisionStyles = createStyles(({ css }) => ({
  pad: css`
    padding-top: 28px;
    padding-bottom: 24px;
  `,
  spinner: css`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 4px solid ${color.brandBg};
    border-top-color: ${color.brand};
    animation: ${spin} 0.9s linear infinite;
    margin-bottom: 16px;
  `,
  steps: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  step: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.size.perk}px;
    color: ${color.text2};
  `,
  dot: css`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid ${color.border};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  dotDone: css`
    background: ${color.brand};
    border-color: ${color.brand};
  `,
  failed: css`
    margin: 16px 0 12px;
    font-size: ${font.size.body}px;
    color: ${color.warn};
  `,
}));
