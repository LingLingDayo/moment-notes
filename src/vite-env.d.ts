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
    detachedNote: {
      notifyParentChanged(noteId: string): void;
      requestAlwaysOnTop(noteId: string, alwaysOnTop: boolean): void;
      requestToggleMaximize(noteId: string): void;
      onChildChanged(callback: (noteId: string) => void): () => void;
      onAlwaysOnTopRequested(
        callback: (payload: { noteId: string; alwaysOnTop: boolean }) => void
      ): () => void;
      onToggleMaximizeRequested(
        callback: (payload: { noteId: string }) => void
      ): () => void;
      onRefreshRequested(callback: () => void): () => void;
      onMaximizeChanged(callback: (isMaximized: boolean) => void): () => void;
    };
  };
}

declare const __APP_VERSION__: string

