/*
 * React SPA 与保留静态页共用的运行时类型约定。
 * 统一维护这里的载荷结构，避免界面与接口定义逐渐漂移。
 */

export type JsonPrimitiveType = string | number | boolean | null;
export type JsonValueType = JsonPrimitiveType | JsonObjectType | JsonArrayType;

export interface JsonObjectType {
  [key: string]: JsonValueType;
}

export type JsonArrayType = JsonValueType[];

export interface IUserType {
  id: number;
  username: string;
  email: string;
  loginCode: string;
  emailBound: boolean;
  emailVerified: boolean;
  questionAnalysisCount: number;
  /**
   * 身份角色（P1-1 账号表合并后由后端返回）。
   *
   * 管理员与普通用户现在走同一条登录路径，前端必须能从登录响应
   * 直接拿到角色，才能「登录后按身份进入不同工作台」；否则还要再请求
   * 一次 `/auth/me`，中间会有一帧「已登录但不知道去哪」的空状态。
   *
   * 这里用字面量而不是从 `identity-api` 引入 `UserRoleType`，
   * 是为了避免 types ↔ api 的循环依赖。
   * 字段可选是兼容老后端：缺失时按普通用户处理。
   */
  role?: 'guest' | 'user' | 'admin';
}

export interface ISchoolLoginType {
  loginUrl?: string;
  mode?: string;
  loginMode?: string;
  successUrlPatterns?: string[];
}

export interface ISchoolCapabilitiesType {
  academicImport?: boolean;
  imageRecognition?: boolean;
}

export interface ISchoolType {
  id: string;
  name: string;
  shortName?: string;
  enabled?: boolean;
  capabilities?: ISchoolCapabilitiesType;
  login?: ISchoolLoginType;
  lessonTimeProfile?: string;
  version?: number;
}

export interface IApiEnvelopeType<T> {
  code: number;
  message: string;
  data: T;
}

export interface IHealthStatusType {
  status?: string;
  version?: string;
}

export interface ILessonTimeType {
  lesson: number;
  startTime: string;
}

export interface ILessonTimeProfileType {
  schoolId: string;
  profile: string;
  lessons: ILessonTimeType[];
}

export interface ICourseType {
  name: string;
  teacher?: string;
  location?: string;
  position?: string;
  startWeek?: number;
  endWeek?: number;
  dayOfWeek?: number;
  day?: number;
  startLesson?: number;
  endLesson?: number;
  startSection?: number;
  endSection?: number;
  weeks?: number[];
  rawTime?: string;
}

export interface ICoursePickupImageType {
  fileName: string;
  originalName?: string;
  contentType?: string;
  size?: number;
}

export interface ICoursePickupRecordType {
  code: string;
  jsonText: string;
  createdAt?: string;
  updatedAt?: string;
  images: ICoursePickupImageType[];
}

export interface ICoursePickupCreateResultType {
  code: string;
  jsonText: string;
  images?: ICoursePickupImageType[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ICourseRecognitionResultType {
  pickupCode: string;
  courses: ICourseType[];
}

export interface ICourseImportSessionType {
  cookie: string;
  studentId: string;
  successUrl: string;
  extra: {
    html?: string;
  };
}

export interface ICourseImportResultType {
  status?: 'parsed' | 'saved';
  schoolId?: string | null;
  schoolName?: string | null;
  importerVersion?: number | null;
  pickupCode?: string;
  courses?: ICourseType[];
  warnings?: string[];
  savedFileName?: string | null;
}

export interface ICourseImportHtmlPayloadType {
  school: string;
  schoolName?: string;
  html: string;
}

export type ICourseImportHtmlResultType = ICourseImportResultType;

export interface IAdminSetupStatusType {
  configured: boolean;
  registrationAvailable: boolean;
}

export interface IAdminAuthResultType {
  authenticated: boolean;
}

export interface IAdminAiConfigType {
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
}

export interface IAdminAiConfigPayloadType {
  baseUrl: string;
  model: string;
  apiKey?: string;
  clearApiKey: boolean;
}

export interface IAdminEmailConfigType {
  enabled: boolean;
  provider: string;
  endpoint: string;
  senderAddress: string;
  senderName: string;
  verificationSubject: string;
  htmlTemplate: string;
  apiKeyConfigured: boolean;
}

export interface IAdminEmailConfigPayloadType {
  enabled: boolean;
  provider: string;
  endpoint: string;
  senderAddress: string;
  senderName: string;
  verificationSubject: string;
  htmlTemplate: string;
  apiKey?: string;
  clearApiKey: boolean;
}

export interface IAppVersionSourceType {
  type: string;
  label: string;
  url: string;
  primary: boolean;
  description?: string;
}

export interface IAdminAppVersionConfigType {
  latestVersion: string;
  latestBuild: number;
  minimumSupportedVersion: string;
  minimumSupportedBuild: number;
  title: string;
  optionalUpdateMessage: string;
  requiredUpdateMessage: string;
  releasePageUrl: string;
  releaseNotes: string;
  downloadSources: IAppVersionSourceType[];
}

export interface IAppVersionCheckRequestType {
  platform: string;
  channel: string;
  currentVersion: string;
  currentBuild: number;
  extra?: Record<string, unknown>;
}

export interface IAppVersionCheckResultType {
  platform?: string;
  channel?: string;
  currentVersion?: string;
  currentBuild?: number;
  updateType?: string;
  updateAvailable?: boolean;
  forceUpdate?: boolean;
  latestVersion?: string;
  latestBuild?: number;
  minimumSupportedVersion?: string;
  minimumSupportedBuild?: number;
  title?: string;
  message?: string;
  releasePageUrl?: string;
  releaseNotes?: string[];
  downloadSources?: IAppVersionSourceType[];
  checkedAt?: string;
}

export interface ISchoolScaffoldPayloadType {
  schoolId: string;
  classPrefix: string;
  name: string;
  shortName: string;
  loginMode: string;
  loginUrl: string;
  successUrlPatterns: string;
  version?: number;
  enabled: boolean;
  academicImport: boolean;
  imageRecognition: boolean;
  overwrite: boolean;
}

export interface IGuideEntryType {
  slug: string;
  title: string;
  summary: string;
  group: string;
}

export interface IGuideSectionType {
  id: string;
  title: string;
  depth: number;
}
