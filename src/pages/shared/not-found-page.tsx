import PageFooter from '../../components/PageFooter';
import SiteHeader from '../../components/SiteHeader';
import SupportFab from '../../components/SupportFab';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

function NotFoundPage() {
  useBodyClass('home-page');
  usePageMeta('404 页面不存在', '你访问的 Clark AAMS 页面不存在或已经被迁移到新的 SPA 路由。');

  return (
    <>
      <SiteHeader />
      <main>
        <section className='page-shell home-hero'>
          <div className='hero-copy'>
            <p className='eyebrow'>404 Not Found</p>
            <h1 className='hero-title'>你访问的页面不存在。</h1>
            <p>
              Clark AAMS 已迁移为 React SPA。你可以回到首页、用户中心或接口文档继续浏览，旧的
              HTML 语义路径也已经尽量兼容。
            </p>
            <div className='button-row'>
              <a className='button-primary' href='/'>
                返回首页
              </a>
              <a className='button-secondary' href='/user'>
                前往用户中心
              </a>
              <a className='button-secondary' href='/api'>
                查看接口页
              </a>
            </div>
          </div>
          <div className='surface-card not-found-side'>
            <p className='eyebrow'>ClarkHub.cn</p>
            <h2>路由兼容已开启</h2>
            <p>
              如果你通过旧地址进入，请检查链接是否正确，或直接访问站点域名
              <strong> clarkhub.cn</strong>。
            </p>
            <ul>
              <li>旧 `.html` 路径已尽量映射到新的 SPA 路由。</li>
              <li>如果你是从收藏夹进入，建议更新为新地址。</li>
              <li>如果你需要后台入口，可直接访问 `/admin`。</li>
            </ul>
          </div>
        </section>
      </main>
      <PageFooter
        leftText='Clark AAMS'
        middleText='大学生课程表导入与识别工具'
        rightHref='/'
        rightLabel='回到首页'
      />
      <SupportFab />
    </>
  );
}

export default NotFoundPage;
