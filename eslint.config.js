import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * 層ごとに import を禁止するパターン（repository-structure.md 3章）。
 * キーは対象ディレクトリ、値は import してはいけないもの。
 */
const layerRestrictions = {
  'src/domain/**': [
    '@/db/*',
    '@/player/*',
    '@/stores/*',
    '@/hooks/*',
    '@/components/*',
    '@/pages/*',
    'react',
    'react-dom',
    'dexie',
    'dexie-react-hooks',
    'zustand',
  ],
  'src/lib/**': ['@/domain/*', '@/db/*', '@/player/*', '@/stores/*', '@/hooks/*', '@/components/*', '@/pages/*'],
  'src/db/**': ['@/player/*', '@/stores/*', '@/hooks/*', '@/components/*', '@/pages/*', 'react'],
  'src/player/**': ['@/domain/*', '@/db/*', '@/stores/*', '@/hooks/*', '@/components/*', '@/pages/*', 'react'],
  'src/stores/**': ['@/db/*', '@/player/*', '@/hooks/*', '@/components/*', '@/pages/*'],
  'src/hooks/**': ['@/components/*', '@/pages/*'],
  // 後に書いた設定が優先されるため、より厳しい components/ui を components の後に置く
  'src/components/**': ['@/db/*', '@/pages/*'],
  'src/components/ui/**': ['@/domain/*', '@/db/*', '@/player/*', '@/stores/*', '@/hooks/*', '@/pages/*'],
  'src/pages/**': ['@/db/*'],
};

const layerConfigs = Object.entries(layerRestrictions).map(([files, patterns]) => ({
  files: [files],
  ignores: ['**/*.test.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: patterns, message: '層の依存ルール（docs/repository-structure.md 3章）に反する import です。' },
        ],
      },
    ],
  },
}));

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML は使用禁止です（XSS対策）。',
        },
        {
          selector: 'TSEnumDeclaration',
          message: 'enum は使わず、as const の配列とユニオン型で表します（development-guidelines.md 2.1）。',
        },
      ],
    },
  },
  ...layerConfigs,
  {
    files: ['*.config.{ts,js}', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
]);
