// Lint widget nhúng: TS recommended, cấm any, cấm console (chạy trên website khách hàng).
import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  rules: { '@typescript-eslint/no-explicit-any': 2, 'no-console': 2 },
});
