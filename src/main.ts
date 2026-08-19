import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import DetachedNoteWindow from '@views/DetachedNoteWindow.vue';
import '@styles/main.scss';
import { initTooltip } from '@utils/tooltip';
import { isDetachedNoteWindow } from './infrastructure/windows/detachedNoteWindow';

const app = createApp(isDetachedNoteWindow() ? DetachedNoteWindow : App);
const pinia = createPinia();

app.use(pinia);

// 初始化全局 Tooltip
initTooltip();

app.mount('#app');
