import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import vuePlugin from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';

export default [
  // 忽略规则（ESLint 扁平配置中使用顶层 ignores 字段代替 .eslintignore）
  {
    ignores: [
      '*.sh',
      'node_modules/',
      '.vscode/',
      '.idea/',
      'dist/',
      '*.local',
      'public/',
      'preload/',
      'src/utils/ipc.ts',
      'src/utils/preloadUtils.ts',
      'src/types/utools.d.ts',
      'src/vite-env.d.ts',
      'src/env.d.ts',
      'src/assets/',
      'src/libs/',
      '*.json',
      'eslint.config.js',
      'postcss.config.js',
      'tailwind.config.js'
    ]
  },

  // 1. 基础 JS 推荐配置
  js.configs.recommended,

  // 2. Vue3 推荐配置
  ...vuePlugin.configs['flat/recommended'],

  // 3. TypeScript 配置 (针对 TS/TSX)
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      // 在这里覆盖或自定义 TS 规则
      ...tsPlugin.configs.recommended.rules
    }
  },

  // 3.5 TypeScript 配置 (针对 Vue 文件中的 TS)
  {
    files: ['**/*.vue'],
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        // 允许在 Vue 文件中解析 TS
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      // 在这里覆盖或自定义 TS 规则
      ...tsPlugin.configs.recommended.rules
    }
  },

  // 4. Prettier 配置（放在最后以覆盖前面的格式化规则）
  prettier,
  {
    plugins: {
      prettier: prettierPlugin
    },
    rules: {
      'prettier/prettier': 'error'
    }
  },

  // 5. 自定义规则与全局配置
  {
    languageOptions: {
      globals: {
        // 比如浏览器全局变量
        window: 'readonly',
        document: 'readonly',
        process: 'readonly',
        // 可以在这里添加 uTools 全局变量
        utools: 'readonly'
      }
    },
    rules: {
      // 覆盖 vue 的规则
      'vue/multi-word-component-names': 'off', // 允许单单词组件名
      'vue/max-attributes-per-line': 'off', // 不限制每行属性数量，交给 prettier 处理
      'vue/html-self-closing': [
        'error',
        {
          html: {
            void: 'always',
            normal: 'never',
            component: 'always'
          },
          svg: 'always',
          math: 'always'
        }
      ],

      // 覆盖 eslint 的规则
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      // 覆盖 typescript 的规则
      '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ]
    }
  }
];
