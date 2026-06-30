import { markRaw } from 'vue';
import { Sun, Moon, Columns, Settings, Database, Info } from 'lucide-vue-next';

export interface SettingOption {
  label: string;
  value: any;
  icon?: any;
}

export type SettingType = 'input' | 'textarea' | 'select' | 'multiselect' | 'radio' | 'custom';

export interface SettingItem {
  key: string;
  label: string;
  type: SettingType;
  desc?: string;
  options?: SettingOption[];
  placeholder?: string;
  props?: Record<string, any>;
}

export interface SettingGroup {
  id: string;
  title: string;
  tabTitle?: string;
  icon?: any;
  items: SettingItem[];
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
        options: [
          { label: '切换主题', value: 'theme-toggle' },
          { label: '排序方式', value: 'sort-select' },
          { label: '列数设置', value: 'columns-select' },
          { label: '清空分类', value: 'clear-notes' },
          { label: '新建便签', value: 'add-note' }
        ]
      },
      {
        key: 'isDark',
        label: '个性化主题',
        type: 'radio',
        desc: '设置界面的显示主题。在 uTools 插件模式下，主题将自动根据 uTools 的偏好设置进行贴合与变换。',
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
        options: [
          { label: '自适应', value: 'auto', icon: markRaw(Columns) },
          { label: '1 列', value: 1, icon: markRaw(Columns) },
          { label: '2 列', value: 2, icon: markRaw(Columns) },
          { label: '3 列', value: 3, icon: markRaw(Columns) },
          { label: '4 列', value: 4, icon: markRaw(Columns) }
        ]
      },
      {
        key: 'sortMode',
        label: '默认便签排序方式',
        type: 'select',
        desc: '设置右侧便签展示列表的默认排序方式。',
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
        desc: '设置列表在升序或降序排列时的默认展示顺序。',
        options: [
          { label: '升序 (A-Z / 旧在前)', value: 'asc' },
          { label: '降序 (Z-A / 新在前)', value: 'desc' }
        ]
      },
      {
        key: 'quickActions',
        label: '快捷操作',
        type: 'custom',
        desc: '在设置中快速触发新建便签或执行清空当前分类等动作。'
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
        type: 'custom',
        desc: '导出备份能将当前所有的便签及分类列表转换为备份文件；导入恢复能从 JSON 备份中加载数据。'
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
        label: '版本信息',
        type: 'custom'
      }
    ]
  }
];
