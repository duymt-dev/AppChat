// Lint backend: TS recommended, cấm any, cấm console (standards/ops/observability-security.md §1.1).
import tseslint from 'typescript-eslint';

const SDK_ONLY_IN_AI = 'Chỉ packages/ai gọi AI SDK — dùng @appchat/ai';

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-explicit-any': 2,
    'no-console': 2,
    // AI SDK / provider chỉ dùng trong packages/ai (agent-gateway §1, TIP-019) — nơi khác đi qua @appchat/ai.
    'no-restricted-imports': [
      2,
      { paths: [{ name: 'ai', message: SDK_ONLY_IN_AI }], patterns: [{ regex: '^(ai/|@ai-sdk/)', message: SDK_ONLY_IN_AI }] },
    ],
  },
});
