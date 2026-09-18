declare module 'electron' {
  export interface IpcRendererEvent {
    sender: unknown;
    senderId: number;
    ports: MessagePort[];
  }

  export interface IpcRenderer {
    on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    once(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    removeListener(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): this;
    removeAllListeners(channel?: string): this;
    send(channel: string, ...args: any[]): void;
    sendTo(webContentsId: number, channel: string, ...args: any[]): void;
    invoke(channel: string, ...args: any[]): Promise<any>;
  }

  export const ipcRenderer: IpcRenderer;
}
