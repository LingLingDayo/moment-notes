/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  services: {
    readFile(file: string): string;
    writeTextFile(text: string, filePath?: string): string;
    writeImageFile(base64Url: string): string | undefined;
  };
}

declare const __APP_VERSION__: string

