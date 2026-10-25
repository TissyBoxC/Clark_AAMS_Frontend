import type { IGuideEntryType } from '../types/app-types';

export const GUIDE_ENTRIES: IGuideEntryType[] = [
  {
    slug: 'intro',
    title: '用户指南 - 应用定位',
    summary: '了解 Clark AAMS 的定位、目标用户和整体能力边界。',
    group: '基础了解',
  },
  {
    slug: 'first_use',
    title: '用户指南 - 首次使用',
    summary: '从首次进入到完成基础设置的推荐顺序。',
    group: '基础了解',
  },
  {
    slug: 'main_interface',
    title: '用户指南 - 主界面',
    summary: '介绍主界面分区、入口和常见操作方式。',
    group: '基础了解',
  },
  {
    slug: 'import_course',
    title: '用户指南 - 课程导入',
    summary: '教务导入入口、学校适配和课表采集流程说明。',
    group: '课程能力',
  },
  {
    slug: 'add_course',
    title: '用户指南 - 课程管理',
    summary: '手动补充、调整和维护课程数据。',
    group: '课程能力',
  },
  {
    slug: 'semester_time',
    title: '用户指南 - 学期与节次时间',
    summary: '配置学期、节次与时间规则。',
    group: '课程能力',
  },
  {
    slug: 'app_settings',
    title: '用户指南 - 应用设置',
    summary: '查看与调整应用偏好、通用选项和行为设置。',
    group: '应用设置',
  },
  {
    slug: 'widgets',
    title: '用户指南 - 桌面小组件与系统卡片',
    summary: '桌面小组件、系统卡片与展示方式说明。',
    group: '应用设置',
  },
  {
    slug: 'profile',
    title: '用户指南 - 我的页面',
    summary: '我的页面入口与个人信息相关能力说明。',
    group: '账户与数据',
  },
  {
    slug: 'account',
    title: '用户指南 - 账号功能',
    summary: '登录码、邮箱验证、账号状态与安全相关说明。',
    group: '账户与数据',
  },
  {
    slug: 'xuexitong',
    title: '用户指南 - 学习通作业辅助',
    summary: '学习通相关辅助功能与使用边界。',
    group: '扩展能力',
  },
  {
    slug: 'about_updates',
    title: '用户指南 - 关于与版本更新',
    summary: '项目版本、更新与发布节奏说明。',
    group: '扩展能力',
  },
  {
    slug: 'data_network',
    title: '用户指南 - 数据保存与网络说明',
    summary: '数据保存策略、网络依赖与同步边界说明。',
    group: '账户与数据',
  },
  {
    slug: 'faq',
    title: '用户指南 - 常见问题',
    summary: '集中回答使用中最常见的问题。',
    group: '扩展能力',
  },
  {
    slug: 'feature_list',
    title: '用户指南 - 功能清单',
    summary: '完整功能列表与模块索引。',
    group: '扩展能力',
  },
];

export const GUIDE_ALIAS_MAP: Record<string, string> = {
  import: 'import_course',
  'screenshot-import': 'feature_list',
};

export function resolveGuideSlug(rawSlug: string | undefined): string {
  const normalizedSlug = String(rawSlug ?? '')
    .trim()
    .replace(/\.html$/i, '');

  return GUIDE_ALIAS_MAP[normalizedSlug] ?? normalizedSlug;
}

export function findGuideEntry(slug: string | undefined): IGuideEntryType | undefined {
  const resolvedSlug = resolveGuideSlug(slug);

  return GUIDE_ENTRIES.find((entry) => entry.slug === resolvedSlug);
}
