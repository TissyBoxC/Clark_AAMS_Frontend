/* 与后端契约对齐的运行时类型（见 docs/api-contract.md）。 */

export interface IApiEnvelopeType<T> {
  code: number;
  message: string;
  data: T;
}

export type UserRoleType = 'guest' | 'user' | 'admin';

export interface IUserType {
  id: number;
  username: string;
  email: string;
  loginCode: string;
  emailBound: boolean;
  emailVerified: boolean;
  questionAnalysisCount: number;
  role?: UserRoleType;
}

export interface IIdentityType {
  role: UserRoleType;
  authenticated: boolean;
  displayName: string;
  user: IUserType | null;
}

/** 课表里的一门课（服务端返回结构）。 */
export interface ICourseType {
  id: number;
  name: string;
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location: string;
  teacher: string;
  rawTime: string;
  weeks: number[];
  weekRanges: [number, number][];
  weekRule: 'ALL' | 'ODD' | 'EVEN';
  startWeek: number;
  endWeek: number;
}

export interface ICourseDraftType {
  name: string;
  dayOfWeek: number;
  startLesson: number;
  endLesson: number;
  location?: string;
  teacher?: string;
  rawTime?: string;
  weeks?: number[];
  weekRanges?: [number, number][];
  weekRule?: 'ALL' | 'ODD' | 'EVEN';
}

/** 导入、识别返回的原始课程：字段都可缺，必须先归一化。 */
export interface IRawCourseType {
  name?: string;
  teacher?: string;
  location?: string;
  position?: string;
  dayOfWeek?: number;
  day?: number;
  startLesson?: number;
  endLesson?: number;
  startSection?: number;
  endSection?: number;
  startWeek?: number;
  endWeek?: number;
  weeks?: number[];
  rawTime?: string;
}

export interface ISchoolType {
  id: string;
  name: string;
  shortName?: string;
  enabled?: boolean;
  capabilities?: {
    academicImport?: boolean;
    imageRecognition?: boolean;
  };
  login?: {
    loginUrl?: string;
    mode?: string;
    loginMode?: string;
    successUrlPatterns?: string[];
  };
  lessonTimeProfile?: string;
  version?: number;
}

export interface ILessonTimeProfileType {
  schoolId: string;
  profile: string;
  lessons: Array<{ lesson: number; startTime: string }>;
}

export interface IPickupImageType {
  fileName: string;
  originalName?: string;
  contentType?: string;
  size?: number;
}

export interface IPickupRecordType {
  code: string;
  jsonText: string;
  createdAt?: string;
  updatedAt?: string;
  images: IPickupImageType[];
}

export interface IRecognitionResultType {
  pickupCode: string;
  courses: IRawCourseType[];
}

export interface IImportSessionType {
  cookie: string;
  studentId: string;
  successUrl: string;
  extra: { html?: string };
}

export interface IImportResultType {
  status?: 'parsed' | 'saved';
  schoolId?: string | null;
  schoolName?: string | null;
  pickupCode?: string;
  courses?: IRawCourseType[];
  warnings?: string[];
}

export interface IQuestionResultType {
  answer?: string;
  analysis?: string;
  [key: string]: unknown;
}

export interface IQuotaScopeType {
  scope: string;
  calls?: number;
  count?: number;
}

export interface IQuotaDashboardType {
  totalCalls: number;
  scopes: IQuotaScopeType[];
  users: Array<{
    userId: number;
    totalCalls: number;
    byScope: IQuotaScopeType[];
    exhaustedScopes: string[];
  }>;
  inMemoryOnly: boolean;
  note: string;
}

export interface IAiConfigType {
  baseUrl: string;
  model: string;
  apiKeyConfigured: boolean;
}

export interface IEmailConfigType {
  enabled: boolean;
  provider: string;
  endpoint: string;
  senderAddress: string;
  senderName: string;
  verificationSubject: string;
  htmlTemplate: string;
  apiKeyConfigured: boolean;
}

export interface IVersionSourceType {
  type: string;
  label: string;
  url: string;
  primary: boolean;
  description?: string;
}

export interface IVersionConfigType {
  latestVersion: string;
  latestBuild: number;
  minimumSupportedVersion: string;
  minimumSupportedBuild: number;
  title: string;
  optionalUpdateMessage: string;
  requiredUpdateMessage: string;
  releasePageUrl: string;
  releaseNotes: string;
  downloadSources: IVersionSourceType[];
}

export interface ISetupStatusType {
  configured: boolean;
  registrationAvailable: boolean;
}

export interface ISchoolScaffoldDraftType {
  schoolId: string;
  classPrefix: string;
  name: string;
  shortName: string;
  loginMode: string;
  loginUrl: string;
  successUrlPatterns: string;
  enabled: boolean;
  academicImport: boolean;
  imageRecognition: boolean;
  overwrite: boolean;
}
