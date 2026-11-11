import type { SettingPlatform } from '../../domain/settings/SettingDefinition';

/**
 * 识别当前运行形态。
 * - utools：作为 uTools 插件运行（存在 window.utools）
 * - electron：作为独立桌面应用运行（preload 注入了 window.desktop）
 * - browser：普通浏览器，仅用于开发调试或网页版
 */
export const getRuntimePlatform = (): SettingPlatform => {
  if (typeof window === 'undefined') return 'browser';
  if (typeof window.utools !== 'undefined') return 'utools';
  if (window.desktop?.platform === 'electron') return 'electron';
  return 'browser';
};

export const isUTools = (): boolean => getRuntimePlatform() === 'utools';
export const isElectron = (): boolean => getRuntimePlatform() === 'electron';
export const isBrowser = (): boolean => getRuntimePlatform() === 'browser';
