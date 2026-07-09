import { markRaw } from 'vue';
import { Sun, Moon, Columns, Settings, Database, Info, Trash2, Keyboard } from 'lucide-vue-next';
import DataPanel from './DataPanel.vue';
import AboutPanel from './AboutPanel.vue';


export interface SettingOption {
  label: string;
  value: any;
  icon?: any;
  html?: string;
  color?: string;
}

export type SettingType = 'input' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'button-group' | 'component' | 'shortcut' | 'text' | 'slider';

export interface ButtonConfig {
  label: string | ((store: any) => string);
  icon?: any;
  variant?: 'primary' | 'danger' | 'secondary';
  color?: string;
  width?: string;
  minWidth?: string;
  actionKey: string;
  disabled?: boolean | ((store: any) => boolean);
  visible?: boolean | ((store: any) => boolean);
}

export interface TextInputProps {
  type?: 'text' | 'password' | 'email';
  style?: string;
}

export interface NumberInputProps {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  style?: string;
}

export interface SelectProps {
  width?: string;
  style?: string;
}

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  style?: string;
}

export type SettingProps = TextInputProps | NumberInputProps | SelectProps | SliderProps;

export interface SettingItem {
  key: string;
  label: string;
  type: SettingType;
  desc?: string;
  default?: any;
  tooltip?: string;
  options?: SettingOption[] | ((store: any) => SettingOption[]);
  placeholder?: string;
  props?: SettingProps;
  width?: string;
  buttons?: ButtonConfig[];
  component?: any;
  visible?: boolean | ((store: any) => boolean);
  content?: string;
  controlWidth?: string;
  showHeader?: boolean;
  hideHeader?: boolean;
}

export interface SettingGroup {
  id: string;
  title: string;
  tabTitle?: string;
  icon?: any;
  items: SettingItem[];
  visible?: boolean | ((store: any) => boolean);
}

/**
 * 通用条件渲染求值器
 * 支持 visible 属性为 boolean、返回 boolean 的函数、或未定义
 */
export function evaluateVisibility(
  visible: boolean | ((store: any) => boolean) | undefined,
  store: any
): boolean {
  if (visible === undefined) return true;
  if (typeof visible === 'function') {
    return visible(store);
  }
  return !!visible;
}

export const SETTINGS_SCHEMA: SettingGroup[] = [
  {
    id: 'general',
    title: '常规偏好设置',
    tabTitle: '常规设置',
    icon: markRaw(Settings),
    items: [
      {
        key: 'enabledActionBarButtons',
        label: '右上角功能按钮管理',
        type: 'multiselect',
        desc: '配置要在右上角操作栏中显示的功能按钮。',
        default: ['theme-toggle', 'sort-select', 'columns-select', 'clear-notes'],
        props: {
          width: '320px'
        },
        options: [
          { label: '切换主题', value: 'theme-toggle' },
          { label: '排序方式', value: 'sort-select' },
          { label: '列数设置', value: 'columns-select' },
          { label: '清空分类', value: 'clear-notes' }
        ]
      },
      {
        key: 'isDark',
        label: '个性化主题',
        type: 'radio',
        desc: '设置界面的显示主题。在 uTools 插件模式下，主题将自动根据 uTools 的偏好设置进行贴合与变换。',
        default: false,
        options: [
          { label: '浅色模式', value: false, icon: markRaw(Sun) },
          { label: '深色模式', value: true, icon: markRaw(Moon) }
        ]
      },
      {
        key: 'gridColumns',
        label: '便签展示列数',
        type: 'radio',
        desc: '调整便签卡片在右侧展示区的排列列数。选择“自适应”将根据界面宽度自动计算最合适的排布数量。',
        default: 'auto',
        options: [
          { label: '自适应', value: 'auto', icon: markRaw(Columns) },
          { label: '1 列', value: 1, icon: markRaw(Columns) },
          { label: '2 列', value: 2, icon: markRaw(Columns) },
          { label: '3 列', value: 3, icon: markRaw(Columns) },
          { label: '4 列', value: 4, icon: markRaw(Columns) }
        ]
      },
      {
        key: 'minNoteWidth',
        label: '便签自适应最小宽度',
        type: 'input',
        desc: '在“自适应”展示列数模式下生效，单个便签卡片的最小宽度限制。默认值为 240，允许设置范围为 100 - 1000。',
        default: 240,
        placeholder: '240',
        controlWidth: '50%',
        props: {
          type: 'number',
          min: 100,
          max: 1000
        },
        visible: (store: any) => store.gridColumns === 'auto'
      },
      {
        key: 'noteMaxHeight',
        label: '便签卡片最大高度',
        type: 'slider',
        desc: '限制单个便签卡片在浏览模式下的最大展示高度。超出此限制时内部会自动出现滚动条。',
        default: 300,
        props: {
          min: 150,
          max: 600,
          step: 10
        }
      },
      {
        key: 'sortMode',
        label: '默认便签排序方式',
        type: 'select',
        desc: '设置默认的便签排序规则。',
        default: 'date',
        width: '50%',
        options: [
          { label: '按日期排序', value: 'date' },
          { label: '按标题首字母排序', value: 'title' },
          { label: '按标签排序', value: 'tag' },
          { label: '自定义排序 (拖拽)', value: 'custom' }
        ]
      },
      {
        key: 'sortOrder',
        label: '默认排序顺序',
        type: 'radio',
        desc: '设置列表的默认排列顺序。',
        default: 'desc',
        width: '50%',
        options: [
          { label: '升序', value: 'asc' },
          { label: '降序', value: 'desc' }
        ]
      },
      {
        key: 'dateFormat',
        label: '自定义便签日期格式',
        type: 'input',
        desc: '自定义便签卡片底部显示的更新日期格式。',
        default: 'YYYY.MM.DD HH:mm',
        placeholder: 'YYYY.MM.DD HH:mm',
        tooltip: '支持的格式说明:\nYYYY - 四位年 (如 2026)\nYY - 两位年 (如 26)\nMM - 两位月 (01-12)\nM - 一位月 (1-12)\nDD - 两位日 (01-31)\nD - 一位日 (1-31)\nHH - 两位24小时制小时 (00-23)\nH - 一位24小时制小时 (0-23)\nhh - 两位12小时制小时 (01-12)\nh - 一位12小时制小时 (1-12)\nmm - 两位分钟 (00-59)\nm - 一位分钟 (0-59)\nss - 两位秒数 (00-59)\ns - 一位秒数 (0-59)\nA - 上下午标记 (AM/PM)\na - 中文上下午标记 (上午/下午)\n示例: YYYY-MM-DD HH:mm:ss 或 YYYY/MM/DD',
        props: {
          type: 'text',
          style: 'max-width: 240px;'
        }
      },
      {
        key: 'defaultNoteColor',
        label: '默认便签颜色',
        type: 'select',
        desc: '新建便签或从外部捕获时，默认的卡片背景色。',
        default: 'yellow',
        props: {
          style: 'max-width: 240px;'
        },
        options: [
          { label: '暖阳黄', value: 'yellow', color: 'yellow', html: '<span style="font-weight: 500;">暖阳黄</span>' },
          { label: '薄荷绿', value: 'green', color: 'green', html: '<span style="font-weight: 500;">薄荷绿</span>' },
          { label: '晴空蓝', value: 'blue', color: 'blue', html: '<span style="font-weight: 500;">晴空蓝</span>' },
          { label: '蔷薇粉', value: 'pink', color: 'pink', html: '<span style="font-weight: 500;">蔷薇粉</span>' },
          { label: '熏衣紫', value: 'purple', color: 'purple', html: '<span style="font-weight: 500;">熏衣紫</span>' },
          { label: '极简灰', value: 'gray', color: 'gray', html: '<span style="font-weight: 500;">极简灰</span>' }
        ]
      },
      {
        key: 'superPanelDefaultCategory',
        label: '超级面板默认分类',
        type: 'select',
        desc: '配置通过 uTools 超级面板（如快捷导入、保存为便签等）唤醒插件时，默认自动跳转并切换到的分类。',
        default: 'all',
        props: {
          style: 'max-width: 240px;'
        },
        options: (store: any) => {
          const list = [
            { label: '全部便签', value: 'all' },
            { label: '最近使用', value: 'recent' },
            { label: '最近删除', value: 'trash' }
          ];
          if (store.categories && Array.isArray(store.categories)) {
            store.categories.forEach((cat: any) => {
              list.push({
                label: cat.name,
                value: cat.id
              });
            });
          }
          return list;
        }
      },
      {
        key: 'quickActions',
        label: '快捷操作',
        type: 'button-group',
        desc: '在设置中快速执行清空当前分类或清空最近删除等管理动作。',
        buttons: [
          {
            label: (store: any) => {
              if (store.currentCategoryId === 'trash') {
                return '清空最近删除';
              }
              return store.currentCategoryId === 'all' ? '清空所有便签' : '清空当前分类便签';
            },
            icon: markRaw(Trash2),
            variant: 'danger',
            width: 'auto',
            minWidth: '100px',
            actionKey: 'clearNotes',
            disabled: (store: any) => store.filteredNotes.length === 0
          }
        ]
      }
    ]
  },
  {
    id: 'data',
    title: '数据备份与恢复',
    tabTitle: '数据管理',
    icon: markRaw(Database),
    items: [
      {
        key: 'backupRestore',
        label: '备份操作',
        type: 'component',
        desc: '导出备份能将当前所有的便签及分类列表转换为备份文件；导入恢复能从 JSON 备份中加载数据。',
        component: markRaw(DataPanel)
      }
    ]
  },
  {
    id: 'shortcuts',
    title: '快捷键与快捷操作',
    tabTitle: '快捷设置',
    icon: markRaw(Keyboard),
    items: [
      {
        key: 'addNote',
        label: '新建便签',
        type: 'shortcut',
        tooltip: '在当前所在分类下极速新建一个空白便签',
        controlWidth: '80%'
      },
      {
        key: 'focusSearch',
        label: '聚焦搜索',
        type: 'shortcut',
        tooltip: '一键将输入光标聚焦到顶部的搜索框中',
        controlWidth: '80%'
      },
      {
        key: 'saveEdit',
        label: '保存编辑',
        type: 'shortcut',
        tooltip: '在编辑便签内容时，快捷保存并结束编辑状态',
        controlWidth: '80%'
      },
      {
        key: 'cancelEdit',
        label: '取消编辑',
        type: 'shortcut',
        tooltip: '在编辑便签内容时，放弃修改并退出编辑状态',
        controlWidth: '80%'
      },
      {
        key: 'shortcutTips',
        label: '快捷操作指南',
        type: 'text',
        content: `<ul>
          <li><strong>双击隐藏粘贴：</strong>双击便签卡片会直接自动收起窗口，并自动将便签内容填至您原先光标所在的输入位置。</li>
          <li><strong>捕获外部文本：</strong>在 uTools 的超级面板中，可以直接选中文本一键导入并创建新便签。</li>
        </ul>`
      }
    ]
  },
  {
    id: 'about',
    title: '关于拾光便签',
    tabTitle: '关于插件',
    icon: markRaw(Info),
    items: [
      {
        key: 'aboutInfo',
        label: '',
        type: 'component',
        component: markRaw(AboutPanel)
      }
    ]
  }
];
