import PageFooter from '../../components/PageFooter';
import SiteHeader from '../../components/SiteHeader';
import SupportFab from '../../components/SupportFab';
import { buildApiUrl, getApiBaseUrl } from '../../api/http';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

interface IApiLinkType {
  method: string;
  path: string;
  description: string;
  href?: string;
}

const PUBLIC_ENDPOINTS: IApiLinkType[] = [
  { method: 'GET', path: '/api/v1/health', description: '服务状态', href: buildApiUrl('/api/v1/health') },
  { method: 'GET', path: '/api/v1/schools', description: '学校列表', href: buildApiUrl('/api/v1/schools') },
  {
    method: 'GET',
    path: '/api/v1/schools/{schoolId}',
    description: '学校配置',
    href: buildApiUrl('/api/v1/schools/jit'),
  },
  {
    method: 'GET',
    path: '/api/v1/schools/{schoolId}/lesson-times',
    description: '节次时间',
    href: buildApiUrl('/api/v1/schools/jit/lesson-times'),
  },
  { method: 'POST', path: '/api/v1/imports/{schoolId}/courses', description: '教务导入' },
  {
    method: 'GET',
    path: '/api/v1/app/version',
    description: '版本检查',
    href: buildApiUrl('/api/v1/app/version?platform=android&currentVersion=1.0.0&currentBuild=1'),
  },
  { method: 'POST', path: '/api/v1/app/version/check', description: '版本检查' },
  {
    method: 'POST',
    path: '/api/v1/course-pickups',
    description: '截图识别并生成取件码',
    href: '/user/recognition',
  },
  { method: 'GET', path: '/api/v1/course-pickups/{code}', description: '取回课程 JSON' },
  { method: 'POST', path: '/api/v1/questions/analyze', description: '题目解析' },
];

const DOC_LINKS: IApiLinkType[] = [
  {
    method: 'DOC',
    path: 'flutter-backend-integration.md',
    description: 'Flutter 对接',
    href: '/docs/flutter-backend-integration.md',
  },
  {
    method: 'DOC',
    path: 'flutter-auth-question-analysis.md',
    description: '账号与题目解析',
    href: '/docs/flutter-auth-question-analysis.md',
  },
  {
    method: 'DOC',
    path: 'flutter-ocr-pickup-code-development.md',
    description: 'OCR 取件码',
    href: '/docs/flutter-ocr-pickup-code-development.md',
  },
  {
    method: 'DOC',
    path: 'question-analysis-api.md',
    description: '题目解析',
    href: '/docs/question-analysis-api.md',
  },
  {
    method: 'DOC',
    path: 'school-importer-development.md',
    description: '学校适配器',
    href: '/docs/school-importer-development.md',
  },
];

function ApiPage() {
  useBodyClass('api-page');
  usePageMeta('开发文档', '面向开发者的接入说明与公开数据说明。');
  const apiAccessLabel = getApiBaseUrl() || '/api (统一入口)';

  return (
    <>
      <SiteHeader showUserEntry={false} />
      <main>
        <section className='page-shell api-hero'>
          <div className='api-hero-grid'>
            <div>
              <p className='eyebrow'>API Surface</p>
              <h1 className='hero-title api-title'>
                接口入口
              </h1>
              <p className='api-lead'>
                当前项目暴露学校配置、教务导入、版本检查、课表 OCR、取件码回查、用户账号与后台管理接口。当前环境接口入口为 {apiAccessLabel}，前端不承载任何接口服务。
              </p>
            </div>
            <aside className='surface-card api-overview-card'>
              <span>Public Surface</span>
              <strong>{PUBLIC_ENDPOINTS.length} 个常用入口</strong>
              <p>适合 Web 与 Flutter 快速接入时直接定位接口职责。</p>
            </aside>
          </div>
        </section>

        <section className='section-shell'>
          <div className='section-heading'>
            <p className='eyebrow'>Public Endpoints</p>
            <h2>公开接口</h2>
            <p>用户端与 Flutter 客户端可直接访问的接口入口。</p>
          </div>
          <div className='api-grid'>
            {PUBLIC_ENDPOINTS.map((endpoint) => {
              const content = (
                <>
                  <span>{endpoint.method}</span>
                  <strong>{endpoint.path}</strong>
                  <em>{endpoint.description}</em>
                </>
              );

              return endpoint.href ? (
                <a key={endpoint.path} className='surface-card api-row' href={endpoint.href}>
                  {content}
                </a>
              ) : (
                <div key={endpoint.path} className='surface-card api-row'>
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <section className='section-shell'>
          <div className='section-heading'>
            <p className='eyebrow'>Reference Docs</p>
            <h2>项目文档</h2>
            <p>当前已有的接口与开发说明文档入口。</p>
          </div>
          <div className='api-grid'>
            {DOC_LINKS.map((docLink) => (
              <a key={docLink.path} className='surface-card api-row' href={docLink.href}>
                <span>{docLink.method}</span>
                <strong>{docLink.path}</strong>
                <em>{docLink.description}</em>
              </a>
            ))}
          </div>
        </section>
      </main>

      <PageFooter leftText='珂拉课程表 开发者文档' rightHref='/' rightLabel='返回首页' />
      <SupportFab />
    </>
  );
}

export default ApiPage;
