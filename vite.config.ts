/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { utoolsPlugin } from './scripts/vitePluginUtools'
import { electronPlugin } from './scripts/vitePluginElectron'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vitejs.dev/config/
// `--mode electron` 构建独立桌面应用，其余模式保持原有的 uTools / 网页构建
export default defineConfig(({ mode }) => ({
  plugins: [vue(), mode === 'electron' ? electronPlugin() : utoolsPlugin()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  server: {
    port: 4021,
    host: '127.0.0.1',
    strictPort: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@modules': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@stores': fileURLToPath(new URL('./src/stores', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
      '@type': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@views': fileURLToPath(new URL('./src/views', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use "@/styles/variables" as *;
          @use "@/styles/mixins" as *;
        `
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'electron/**/*.{test,spec}.ts']
  }
}))
