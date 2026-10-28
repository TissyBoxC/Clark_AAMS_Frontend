import { Link } from 'react-router-dom';

import SiteHeader, { SiteFooter } from '../../components/SiteChrome';
import { PageMeta } from '../../components/ui';

export default function NotFoundPage() {
  return (
    <>
      <PageMeta title="没找到这一页 · 珂拉课程表" description="这个地址下没有内容，可以回到首页或课表。" />
      <SiteHeader />
      <main className="notfound">
        <div className="shell">
          <div className="notfound__card">
            <span className="tag tag--amber">地址不存在</span>
            <h1>这一页不在了</h1>
            <p className="lede">
              可能是链接抄错了一个字符，也可能是这一页被合并到别处。
              从下面选一个入口继续，课表和个人内容都不受影响。
            </p>
            <div className="row">
              <Link className="btn btn--primary" to="/">回到首页</Link>
              <Link className="btn btn--quiet" to="/user">打开我的课表</Link>
              <Link className="btn btn--ghost" to="/guide">翻使用指南</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
