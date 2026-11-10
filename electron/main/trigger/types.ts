import type { TriggerBackend } from '../../../src/domain/desktop/triggerValidation';

/** @param gestureStartedAt 手势起始时刻（毫秒时间戳），窗口切换逻辑用它判断失焦是否由本次手势引起 */
export type TriggerHandler = (gestureStartedAt: number) => void;

/** 一个已经生效的全局监听实例 */
export interface TriggerBackendInstance {
  readonly kind: TriggerBackend;
  /** 暂停期间不触发，并且不占用按键（录制新快捷键时需要） */
  setPaused(paused: boolean): void;
  dispose(): void;
}
