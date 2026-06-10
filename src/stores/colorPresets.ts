import { NoteColorPreset } from '@type';

// 精心设计的配色方案，符合现代审美
export const COLOR_PRESETS: Record<string, NoteColorPreset> = {
  yellow: {
    name: '暖阳黄',
    lightBg: 'hsl(48, 100%, 88%, 0.75)',
    darkBg: 'hsl(48, 40%, 18%, 0.75)',
    lightBorder: 'hsl(48, 100%, 75%)',
    darkBorder: 'hsl(48, 40%, 30%)',
    lightText: 'hsl(48, 80%, 15%)',
    darkText: 'hsl(48, 100%, 85%)',
    lightBtnHoverBg: 'hsl(48, 80%, 80%)',
    lightBtnHoverColor: 'hsl(48, 90%, 12%)',
    darkBtnHoverBg: 'hsla(48, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(48, 100%, 88%)'
  },
  green: {
    name: '薄荷绿',
    lightBg: 'hsl(120, 75%, 90%, 0.75)',
    darkBg: 'hsl(120, 30%, 16%, 0.75)',
    lightBorder: 'hsl(120, 75%, 80%)',
    darkBorder: 'hsl(120, 30%, 28%)',
    lightText: 'hsl(120, 70%, 15%)',
    darkText: 'hsl(120, 85%, 85%)',
    lightBtnHoverBg: 'hsl(120, 75%, 84%)',
    lightBtnHoverColor: 'hsl(120, 75%, 12%)',
    darkBtnHoverBg: 'hsla(120, 50%, 50%, 0.13)',
    darkBtnHoverColor: 'hsl(120, 85%, 88%)'
  },
  blue: {
    name: '晴空蓝',
    lightBg: 'hsl(200, 90%, 90%, 0.75)',
    darkBg: 'hsl(200, 40%, 17%, 0.75)',
    lightBorder: 'hsl(200, 90%, 80%)',
    darkBorder: 'hsl(200, 40%, 30%)',
    lightText: 'hsl(200, 75%, 15%)',
    darkText: 'hsl(200, 90%, 85%)',
    lightBtnHoverBg: 'hsl(200, 90%, 84%)',
    lightBtnHoverColor: 'hsl(200, 80%, 12%)',
    darkBtnHoverBg: 'hsla(200, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(200, 90%, 88%)'
  },
  pink: {
    name: '蔷薇粉',
    lightBg: 'hsl(340, 85%, 91%, 0.75)',
    darkBg: 'hsl(340, 40%, 18%, 0.75)',
    lightBorder: 'hsl(340, 85%, 82%)',
    darkBorder: 'hsl(340, 40%, 30%)',
    lightText: 'hsl(340, 75%, 15%)',
    darkText: 'hsl(340, 90%, 85%)',
    lightBtnHoverBg: 'hsl(340, 85%, 84%)',
    lightBtnHoverColor: 'hsl(340, 80%, 12%)',
    darkBtnHoverBg: 'hsla(340, 60%, 55%, 0.13)',
    darkBtnHoverColor: 'hsl(340, 90%, 88%)'
  },
  purple: {
    name: '熏衣紫',
    lightBg: 'hsl(270, 80%, 92%, 0.75)',
    darkBg: 'hsl(270, 35%, 18%, 0.75)',
    lightBorder: 'hsl(270, 80%, 83%)',
    darkBorder: 'hsl(270, 35%, 30%)',
    lightText: 'hsl(270, 70%, 15%)',
    darkText: 'hsl(270, 90%, 85%)',
    lightBtnHoverBg: 'hsl(270, 80%, 86%)',
    lightBtnHoverColor: 'hsl(270, 75%, 12%)',
    darkBtnHoverBg: 'hsla(270, 55%, 58%, 0.13)',
    darkBtnHoverColor: 'hsl(270, 90%, 88%)'
  },
  gray: {
    name: '极简灰',
    lightBg: 'hsl(0, 0%, 93%, 0.75)',
    darkBg: 'hsl(0, 0%, 18%, 0.75)',
    lightBorder: 'hsl(0, 0%, 82%)',
    darkBorder: 'hsl(0, 0%, 30%)',
    lightText: 'hsl(0, 0%, 15%)',
    darkText: 'hsl(0, 0%, 85%)',
    lightBtnHoverBg: 'hsl(0, 0%, 84%)',
    lightBtnHoverColor: 'hsl(0, 0%, 10%)',
    darkBtnHoverBg: 'hsla(0, 0%, 70%, 0.1)',
    darkBtnHoverColor: 'hsl(0, 0%, 92%)'
  }
};
