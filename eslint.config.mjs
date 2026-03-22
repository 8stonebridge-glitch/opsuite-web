import coreWebVitals from 'eslint-config-next/core-web-vitals';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const eslintConfig = [
  ...coreWebVitals,
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  {
    ignores: ['convex/_generated/**', 'scripts/**', '.aes', '.aes/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
];

export default eslintConfig;
