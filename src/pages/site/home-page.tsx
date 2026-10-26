import PageFooter from '../../components/PageFooter';
import SiteHeader from '../../components/SiteHeader';
import SupportFab from '../../components/SupportFab';
import { useAuthStore } from '../../store/auth-context';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { qqAvatarUrl } from '../../utils/avatar';

function HomePage() {
  const { isAuthResolved, user } = useAuthStore();

  useBodyClass('home-page');
  usePageMeta('珂拉课程表 官网', '珂拉课程表 提供课表导入、截图识别与取件码回查。');

  const isLoggedIn = isAuthResolved && user.id > 0;
  const userHref = isLoggedIn ? '/user' : '/login';
  const registerHref = isLoggedIn ? '/user' : '/auth/register';
  const userLabel = isLoggedIn ? user.username || user.email || '已登录' : '立即登录';
  const userAvatarUrl = isLoggedIn ? qqAvatarUrl(user.email) : '/site/logo.png';

  return (
    <>
      <SiteHeader userHref={userHref} userLabel={userLabel} userAvatarUrl={userAvatarUrl} />

      <main>
        <section className='page-shell home-hero home-hero--official'>
          <div className='hero-copy'>
            <img className='hero-mark' src='/site/logo.png' alt='' />
            <h1 className='hero-title'>珂拉课程表</h1>
            <p>导入教务课表，识别截图课程，用取件码找回结果。适合学生快速整理自己的课程表。</p>
            <div className='hero-chips' aria-label='产品特点'>
              <span className='hero-chip stable'>教务导入</span>
              <span className='hero-chip fast'>截图识别</span>
              <span className='hero-chip high'>取件码</span>
            </div>
            <div className='button-row'>
              <a className='button-primary' href={registerHref}>
                {isLoggedIn ? '进入用户中心' : '开始使用'}
              </a>
              <a className='button-secondary' href='/docs/user-guide/intro'>
                查看指南
              </a>
            </div>
          </div>
          <div className='hero-product-panel' aria-hidden='true'>
            <div className='hero-orbit'></div>
            <div className='timetable-preview'>
              <div className='timetable-preview__head'>
                <span>本周课程</span>
                <strong>已整理</strong>
              </div>
              <div className='timetable-grid'>
                <span></span><span></span><span className='active'></span><span></span><span></span>
                <span className='active soft'></span><span></span><span></span><span></span><span className='active'></span>
                <span></span><span className='active'></span><span></span><span className='active soft'></span><span></span>
              </div>
            </div>
            <div className='hero-flow-card'>
              <span>导入</span>
              <span>识别</span>
              <span>取回</span>
            </div>
          </div>
        </section>

        <section className='section-shell home-section' id='capabilities'>
          <div className='section-heading'>
            <p className='eyebrow'>Features</p>
            <h2>三种方式把课表放进来看得懂的地方。</h2>
            <p>不在官网里打断操作。登录后进入用户中心，再选择导入、识别或取件码回查。</p>
          </div>
          <div className='feature-grid'>
            <article className='surface-card feature-card'>
              <div className='feature-icon'>01</div>
              <h3>教务导入</h3>
              <p>从已支持的学校入口进入，解析课程数据。</p>
            </article>
            <article className='surface-card feature-card'>
              <div className='feature-icon'>02</div>
              <h3>截图识别</h3>
              <p>上传课表截图，识别后生成课程 JSON。</p>
            </article>
            <article className='surface-card feature-card'>
              <div className='feature-icon'>03</div>
              <h3>取件码回查</h3>
              <p>保存 8 位取件码，之后随时取回结果。</p>
            </article>
          </div>
        </section>

        <section className='section-shell home-section home-process'>
          <div className='section-heading'>
            <p className='eyebrow'>使用方式</p>
            <h2>登录后，课表、导入和识别都在同一个地方。</h2>
          </div>
          <div className='home-process-grid'>
            <article className='surface-card home-process-step'>
              <span>01</span>
              <h3>登录账号</h3>
              <p>保留你的登录码和课表记录。</p>
            </article>
            <article className='surface-card home-process-step home-process-step--offset'>
              <span>02</span>
              <h3>选择方式</h3>
              <p>按场景选择教务导入或截图识别。</p>
            </article>
            <article className='surface-card home-process-step'>
              <span>03</span>
              <h3>拿到结果</h3>
              <p>复制 JSON，或保存取件码备用。</p>
            </article>
          </div>
        </section>

      </main>

      <PageFooter
        leftText='珂拉课程表'
        middleText='大学生课程表导入与识别工具'
        rightHref='https://github.com/TissyBoxC/Clark_AAMS'
        rightLabel='GitHub'
      />

      <SupportFab />
    </>
  );
}

export default HomePage;
