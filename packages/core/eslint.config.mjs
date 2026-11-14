// Lint backend: TS recommended, cấm any, cấm console (standards/ops/observability-security.md §1.1) + cấm new Date()/Date.now() trực tiếp ở nghiệp vụ (TIP-003g).
import tseslint from 'typescript-eslint';

const SDK_ONLY_IN_AI = 'Chỉ packages/ai gọi AI SDK — dùng @appchat/ai';

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 2,
      'no-console': 2,
      // AI SDK / provider chỉ dùng trong packages/ai (agent-gateway §1, TIP-019) — nơi khác đi qua @appchat/ai.
      'no-restricted-imports': [
        2,
        { paths: [{ name: 'ai', message: SDK_ONLY_IN_AI }], patterns: [{ regex: '^(ai/|@ai-sdk/)', message: SDK_ONLY_IN_AI }] },
      ],
    },
  },
  {
    files: ['src/**/{services,actions,jobs}/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'Dùng Clock (CLOCK / FixedClock) thay vì new Date() trực tiếp (money-time-numbering §2.2). Parse chuỗi/số new Date(x) vẫn hợp lệ.',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'Dùng Clock (CLOCK / FixedClock) thay vì Date.now() trực tiếp; đo hiệu năng dùng performance.now() hoặc // eslint-disable-next-line no-restricted-syntax -- perf.',
        },
      ],
    },
  },
);
