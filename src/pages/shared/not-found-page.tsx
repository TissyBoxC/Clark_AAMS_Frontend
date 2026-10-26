import PageFooter from '../../components/PageFooter';
import SiteHeader from '../../components/SiteHeader';
import SupportFab from '../../components/SupportFab';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

function NotFoundPage() {
  useBodyClass('home-page');
  usePageMeta('没有找到这个页面 · 珂拉课程表', '这个地址没有对应内容，可以回到课表继续使用。');

  return (
    <>
      <SiteHeader />
      <main>
        <section className='page-shell home-hero'>
          <div className='hero-copy'>
            <p className='eyebrow'>页面没找到</p>
            <h1 className='hero-title'>这里没有内容。</h1>
            <p>
              可能是链接少了一个字符，也可能这个页面换了位置。
              从下面任选一处回去都可以。
            </p>
            <div className='button-row'>
              <a className='button-primary' href='/user'>
                回到我的课表
              </a>
              <a className='button-secondary' href='/'>
                返回首页
              </a>
            </div>
          </div>
          <div className='surface-card not-found-side'>
            <p className='eyebrow'>可以试试</p>
            <h2>换个入口再打开</h2>
            <p>
              如果是别人分享的链接，可能是复制时少了一截。
              请对方在页面上重新分享一次。
            </p>
            <p>
              如果这个地址以前能用，把你是从哪里点进来的告诉我们，我们来查。
            </p>
          </div>
        </section>
      </main>
      <PageFooter
        leftText='珂拉课程表'
        middleText='大学生课表导入与识别'
        rightHref='/'
        rightLabel='回到首页'
      />
      <SupportFab />
    </>
  );
}

export default NotFoundPage;
