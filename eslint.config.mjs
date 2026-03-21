import coreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...coreWebVitals,
  {
    ignores: ['convex/_generated/**', 'scripts/**'],
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
];

export default eslintConfig;
