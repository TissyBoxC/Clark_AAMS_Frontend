import { useState } from 'react';
import { Link } from 'react-router-dom';

import SiteHeader, { SiteFooter } from '../../components/SiteChrome';
import { PageMeta } from '../../components/ui';
import { useAuth } from '../../store/useAuth';

const METHODS = [
  {
    id: 'import',
    index: '01',
    title: '从教务系统直接读',
    summary: '学校已经对接过，登录一次就把整学期课表取回来，不用一节一节录。',
    points: [
      '在支持的学校里选自己的学校，按提示在学校的登录页填一次学号密码。',
      '学校密码只在学校的页面里使用，我们只保留解析出来的课程。',
      '读回来的课表会先给你核对，确认后再保存到你的账号。',
    ],
    cta: { label: '查看导入方法', to: '/guide/import' },
  },
  {
    id: 'recognition',
    index: '02',
    title: '传一张课表截图',
    summary: '同学发来的课表图、教务系统里截的屏，直接传上来就能认出课程和节次。',
    points: [
      '支持一次传多张，模糊的图会提示你重传，不会悄悄少课。',
      '识别结果会标出周次、节次和地点，缺的地方可以手动补。',
      '识别成功会给你一个取件码，换设备也能取回这次结果。',
    ],
    cta: { label: '了解识别过程', to: '/guide/recognition' },
  },
  {
    id: 'pickup',
    index: '03',
    title: '用取件码取回',
    summary: '别人整理好的课表、或者你之前存在别处的课表，凭 8 位取件码就能取回来。',
    points: [
      '取件码相当于一把只读的钥匙，取回的是那一份课表本身。',
      '取回之后可以一键存进自己的课表，也可以只是看看。',
      '码丢了也没关系，重新导入一次会生成新的码。',
    ],
    cta: { label: '取件码怎么用', to: '/guide/pickup' },
  },
];

const SNAPSHOTS = [
  {
    meta: '2024 级 · 计算机',
    title: '大二上，一周 18 节',
    body: '周一早八高等数学，周二下午数据结构连上三节，周四一整天空出来做实验。',
    rows: [
      ['周课时', '18 节'],
      ['早八', '2 天'],
      ['空档', '周四全天'],
    ],
  },
  {
    meta: '2023 级 · 汉语言',
    title: '课不多，地点换来换去',
    body: '同一门课这周在文理楼，下周调去实训楼。课表里把地点写在课名下面，找教室不用再翻通知。',
    rows: [
      ['周课时', '12 节'],
      ['换教室', '3 门课'],
    ],
  },
  {
    meta: '使用感受',
    title: '“不用再对着 Excel 一格一格填。”',
    body: '以前开学第一周都在抄课表，现在把教务系统的页面截个图传上来，核对一遍就完事。',
    quote: true,
    rows: [['整理用时', '约 4 分钟']],
  },
  {
    meta: '2022 级 · 临床医学',
    title: '单双周分开上的课，最怕记错',
    body: '系统识别的周次会写成「1-16周(单)」，点开某一周就只看那一周的课，不会再走错教室。',
    rows: [
      ['单双周课', '2 门'],
      ['周次范围', '1-16 周'],
    ],
  },
  {
    meta: '2024 级 · 设计',
    title: '一门课跨三节，颜色分得清',
    body: '连续四节的画室课在表里是一整块，颜色按课程区分，一眼能看出哪几天要带画具。',
    rows: [
      ['连排课', '4 节'],
      ['课程数', '9 门'],
    ],
  },
  {
    meta: '换设备',
    title: '电脑上整理的课表，手机上直接打开',
    body: '课表存在账号里，宿舍电脑、图书馆的公用机、手机浏览器，登录后看到的是同一份。',
    rows: [
      ['同步方式', '登录账号'],
      ['额外步骤', '无'],
    ],
  },
];

const FAQ = [
  {
    q: '学校不在列表里，还能用吗？',
    a: '可以。没有对接教务系统的学校，用截图识别或手动添加都能得到完整课表，功能上不会少东西，只是开学那次要多花几分钟。',
  },
  {
    q: '导入时要填学校教务系统的密码吗？',
    a: '这一步在学校的页面上完成，密码交给学校系统本身。我们只接收解析出来的课程名、节次、地点和老师，不保存你的学校密码。',
  },
  {
    q: '识别出来的课少了一门怎么办？',
    a: '在课表页点「添加课程」手动补上，或者换一张更清晰的截图重识别。识别完成后会先把课程列出来给你核对，就是为了避免直接写进课表。',
  },
  {
    q: '取件码会过期吗？',
    a: '不会。取件码是那份课表的固定编号，只要记录还在就能取回。如果不想让别人再取，可以在取件码页面把记录删掉。',
  },
  {
    q: '为什么有的功能要我验证邮箱？',
    a: '导入、识别和题目解析都用得到账号里的额度，验证邮箱是为了确认账号是你的，避免有人拿别人的邮箱反复注册占用额度。',
  },
  {
    q: '课表会被别人看到吗？',
    a: '不会。课表只在你登录后可见。只有你主动生成并分享取件码时，拿到码的人才能看到那一份结果。',
  },
];

export default function LandingPage() {
  const { user, role, isResolved } = useAuth();
  const [activeMethod, setActiveMethod] = useState('import');
  const isSignedIn = isResolved && Boolean(user) && role !== 'guest';
  const primaryHref = isSignedIn ? (role === 'admin' ? '/admin' : '/user') : '/register';
  const primaryLabel = isSignedIn ? '进入工作台' : '创建账号，导入课表';

  const method = METHODS.find((item) => item.id === activeMethod) ?? METHODS[0];

  return (
    <>
      <PageMeta
        title="珂拉课程表 · 把一学期的课收进一张表"
        description="从教务系统导入、上传课表截图识别，或用取件码取回课程表。珂拉课程表把一学期的课程整理成一份随时能打开的课表。"
      />
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="shell hero__grid">
            <div>
              <h1 className="hero__title">
                开学第一周，<br />把一学期的课<em>收进一张表</em>里。
              </h1>
              <p className="hero__lede">
                珂拉课程表从学校教务系统、课表截图或者一个取件码里，把课程整理成能按周查看的课表。
                在哪台设备上登录，看到的都是同一份。
              </p>
              <div className="hero__actions">
                <Link className="btn btn--primary" to={primaryHref}>
                  {primaryLabel}
                  <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btn--quiet" to="/guide/first-week">
                  先看看怎么用
                </Link>
              </div>
              <div className="hero__facts">
                <div className="hero__fact">
                  <strong>3 种</strong>
                  <span>把课表带进来的方式</span>
                </div>
                <div className="hero__fact">
                  <strong>1-30 周</strong>
                  <span>周次与单双周都能记</span>
                </div>
                <div className="hero__fact">
                  <strong>8 位</strong>
                  <span>取件码，换设备也能取回</span>
                </div>
              </div>
            </div>

            <div className="preview" aria-hidden="true">
              <div className="preview__head">
                <span className="preview__title">第 3 周 · 我的课表</span>
                <div className="preview__weeks">
                  {[1, 2, 3, 4, 5].map((week) => (
                    <span key={week} className={`preview__week ${week === 3 ? 'preview__week--on' : ''}`}>
                      {week}
                    </span>
                  ))}
                </div>
              </div>
              <div className="preview__grid">
                {['周一', '周二', '周三', '周四', '周五'].map((day) => (
                  <span key={day} className="preview__day">{day}</span>
                ))}
                <div className="preview__cell preview__cell--math">
                  <b>高等数学</b>A101 · 1-2 节
                </div>
                <div className="preview__cell preview__cell--design">
                  <b>设计基础</b>画室 3 · 3-4 节
                </div>
                <div className="preview__cell preview__cell--empty" />
                <div className="preview__cell preview__cell--english">
                  <b>大学英语</b>B204 · 1-2 节
                </div>
                <div className="preview__cell preview__cell--empty" />
                <div className="preview__cell preview__cell--empty" />
                <div className="preview__cell preview__cell--physics">
                  <b>大学物理</b>实验楼 2 · 5-6 节
                </div>
                <div className="preview__cell preview__cell--english">
                  <b>大学英语</b>B204 · 3-4 节
                </div>
                <div className="preview__cell preview__cell--empty" />
                <div className="preview__cell preview__cell--math">
                  <b>概率论</b>C302 · 5-6 节
                </div>
              </div>
              <div className="preview__code">
                <div>
                  <span>这次识别生成的取件码</span>
                  <strong>7K2M9Q4D</strong>
                </div>
                <span className="tag tag--mint">已保存</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="methods">
          <div className="shell methods">
            <div className="methods__intro">
              <h2>课表怎么进来，你挑顺手的那一种。</h2>
              <p className="lede" style={{ marginTop: '1rem' }}>
                三种方式最后都落在同一份课表上。开学那次用哪种都行，之后随时可以补、可以改。
              </p>
              <p className="tiny" style={{ marginTop: '1.25rem' }}>
                不确定选哪个？先看第三种，它最多人用。
              </p>
            </div>

            <div className="methods__list">
              {METHODS.map((item) => {
                const isOpen = item.id === activeMethod;
                return (
                  <div key={item.id}>
                    <button
                      className="method"
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setActiveMethod(item.id)}
                    >
                      <span className="method__index">{item.index}</span>
                      <span>
                        <span className="method__title">{item.title}</span>
                        <span className="method__body">{item.summary}</span>
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="method__detail" style={{ padding: '0 1.25rem 1.25rem 4.7rem' }}>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.45rem' }}>
                          {method.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                        <Link className="btn btn--soft btn--sm" to={method.cta.to} style={{ marginTop: '0.85rem' }}>
                          {method.cta.label}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section" id="wall" style={{ paddingTop: 0 }}>
          <div className="shell">
            <h2 style={{ maxWidth: '22ch' }}>真实的课表长什么样</h2>
            <p className="lede" style={{ marginTop: '0.85rem', marginBottom: '2rem' }}>
              下面这些是学生实际遇到的课表情况。每一种都能在珂拉课程表里原样记录下来。
            </p>

            <div className="wall">
              {SNAPSHOTS.map((item) => (
                <article className="wall__item snapshot" key={item.title}>
                  <div className="snapshot__meta">
                    <span>{item.meta}</span>
                    <span aria-hidden="true">·</span>
                  </div>
                  <h3 className={`snapshot__title ${item.quote ? 'snapshot__quote' : ''}`}>{item.title}</h3>
                  <p className="snapshot__body">{item.body}</p>
                  <div className="snapshot__rows">
                    {item.rows.map(([label, value]) => (
                      <div className="snapshot__row" key={label}>
                        <span>{label}</span>
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="guides" style={{ paddingTop: 0 }}>
          <div className="shell">
            <h2>用之前先知道这几件事</h2>
            <p className="lede" style={{ marginTop: '0.85rem', marginBottom: '2rem' }}>
              每篇都很短，讲清楚一步怎么做、做完会看到什么。
            </p>
            <div className="guide-list">
              {[
                { to: '/guide/first-week', title: '第一次使用的顺序', body: '注册、验证邮箱、导入课表，三步走完就能看到这周的课。' },
                { to: '/guide/import', title: '从教务系统导入', body: '学校在支持列表里时，登录一次就能取回整学期课表。' },
                { to: '/guide/recognition', title: '上传截图识别', body: '什么样的截图识别得准，识别完怎么核对。' },
                { to: '/guide/schedule', title: '课表与周次', body: '单双周、调课、连排课在课表里怎么记。' },
                { to: '/guide/pickup', title: '取件码怎么用', body: '取件码能做什么、不能做什么，丢了怎么办。' },
                { to: '/guide/account', title: '账号与登录码', body: '登录码是什么，什么时候该换一个新的。' },
              ].map((item) => (
                <Link className="guide-link" key={item.to} to={item.to}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq" style={{ paddingTop: 0 }}>
          <div className="shell" style={{ maxWidth: '840px' }}>
            <h2>常见问题</h2>
            <p className="lede" style={{ marginTop: '0.85rem', marginBottom: '2rem' }}>
              这里是问得最多的六个问题。没找到答案的，可以在使用指南里继续翻。
            </p>
            <div className="faq">
              {FAQ.map((item) => (
                <details className="faq__item" key={item.q}>
                  <summary>{item.q}</summary>
                  <p className="faq__answer">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="shell">
            <div className="cta">
              <div>
                <h2>这学期的课，现在就整理好。</h2>
                <p>
                  注册只需要邮箱和密码。课表导入后会自动保存，下次换设备登录就能直接看。
                </p>
              </div>
              <div className="row">
                <Link className="btn btn--primary" to={primaryHref}>
                  {primaryLabel}
                </Link>
                <Link className="btn btn--ghost" to="/login">
                  我已有账号
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
