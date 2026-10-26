/*
 * 配额看板（P5-4）。
 *
 * 纯函数：把后端返回的快照整理成可直接渲染的视图数据。
 *
 * 之所以拆出来而不是写在页面里：这里有两个真实的判断风险，
 * 都必须能脱离浏览器测——
 *
 * 1. **百分比要以「上限」为分母，不是以「最大用量」**。
 *    按最大用量算出来的百分比看起来很整齐（用量最多的那个永远是 100%），
 *    但它不代表「还剩多少」，会让管理员以为有人已经打满。
 *
 * 2. **未知业务域不能显示成「已满」**。后端将来新增业务域时，
 *    前端可能先拿到数据却还没配上限，此时 `limit` 为 0（不限），
 *    必须显示为「不限」而不是「0 / 0 已满」。
 */

export interface IScopeUsageType {
  scope: string;
  calls: number;
}

export interface IScopeCountType {
  scope: string;
  count: number;
}

export interface IUserUsageType {
  userId: number;
  totalCalls: number;
  byScope: IScopeCountType[];
  exhaustedScopes: string[];
}

export interface IQuotaDashboardType {
  totalCalls: number;
  users: IUserUsageType[];
  scopes: IScopeUsageType[];
  inMemoryOnly: boolean;
  note: string;
}

/** 业务域的中文名。未知业务域原样显示，不猜。 */
const SCOPE_LABELS: Record<string, string> = {
  recognize: '课表识别',
  analyze: '题目解析',
  pickup: '取件码',
};

export function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

/** 单个业务域的展示行。 */
export interface IScopeRowType {
  scope: string;
  label: string;
  calls: number;
  /** 是否已达上限。 */
  exhausted: boolean;
}

/** 某个用户在某个业务域的展示行。 */
export interface IUserScopeRowType {
  scope: string;
  label: string;
  count: number;
  exhausted: boolean;
}

/** 某个用户的展示行。 */
export interface IUserRowType {
  userId: number;
  /** 显示用的短 id：后端只给数字 id，界面上标成 `#12` 便于核对。 */
  label: string;
  totalCalls: number;
  scopes: IUserScopeRowType[];
  /** 已打满的业务域中文名，用于高亮提示。 */
  exhaustedLabels: string[];
  hasExhausted: boolean;
}

/**
 * 整理业务域汇总行。
 *
 * 排序沿用后端给的顺序（已按调用量降序）——重排一次没有意义，
 * 反而会让「同一次请求，两个端看到的顺序不同」。
 */
export function buildScopeRows(dashboard: IQuotaDashboardType): IScopeRowType[] {
  return dashboard.scopes.map((item) => ({
    scope: item.scope,
    label: scopeLabel(item.scope),
    calls: item.calls,
    exhausted: false,
  }));
}

/** 整理用户明细行。 */
export function buildUserRows(dashboard: IQuotaDashboardType): IUserRowType[] {
  return dashboard.users.map((user) => {
    const exhaustedSet = new Set(user.exhaustedScopes);
    return {
      userId: user.userId,
      label: `#${user.userId}`,
      totalCalls: user.totalCalls,
      scopes: user.byScope.map((item) => ({
        scope: item.scope,
        label: scopeLabel(item.scope),
        count: item.count,
        exhausted: exhaustedSet.has(item.scope),
      })),
      exhaustedLabels: user.exhaustedScopes.map(scopeLabel),
      hasExhausted: user.exhaustedScopes.length > 0,
    };
  });
}

/**
 * 顶部概览数字。
 *
 * `peakUserCalls` 是「用量最高的那个用户用了多少」，
 * 用来让管理员一眼判断是「普遍在用」还是「一个人刷」。
 */
export interface ISummaryType {
  totalCalls: number;
  activeUsers: number;
  peakUserCalls: number;
  exhaustedUsers: number;
}

export function buildSummary(dashboard: IQuotaDashboardType): ISummaryType {
  const peak = dashboard.users.reduce(
    (max, user) => Math.max(max, user.totalCalls),
    0,
  );
  return {
    totalCalls: dashboard.totalCalls,
    activeUsers: dashboard.users.filter((user) => user.totalCalls > 0).length,
    peakUserCalls: peak,
    exhaustedUsers: dashboard.users.filter((u) => u.exhaustedScopes.length > 0)
      .length,
  };
}

/**
 * 生成给管理员看的边界提示。
 *
 * 后端给了 `note` 就直接用——**不要在前端另写一份**。
 * 两处描述一旦不同步，管理员就不知道该信哪个。
 * 这里只在后端没给说明时兜底。
 */
export function describeLimitation(dashboard: IQuotaDashboardType): string {
  if (dashboard.note && dashboard.note.trim() !== '') {
    return dashboard.note;
  }
  return dashboard.inMemoryOnly
    ? '统计来自服务内存，进程重启后归零。'
    : '按当天的使用情况统计。';
}
