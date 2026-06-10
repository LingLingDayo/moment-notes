import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import '@styles/main.scss';
import { initTooltip } from '@utils/tooltip';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

// 初始化全局 Tooltip
initTooltip();

app.mount('#app');
