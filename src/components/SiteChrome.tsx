import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Icon } from './Icons';
import { useAuth } from '../store/useAuth';

const NAV_ITEMS = [
  { to: '/#methods', label: '能做什么' },
  { to: '/#wall', label: '课表样例' },
  { to: '/guide', label: '使用指南' },
  { to: '/#faq', label: '常见问题' },
];

export default function SiteHeader() {
  const { user, role, isResolved } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isSignedIn = isResolved && Boolean(user) && role !== 'guest';
  const workspace = role === 'admin' ? '/admin' : '/user';

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" to="/" aria-label="珂拉课程表 首页">
          <span className="brand__mark">珂</span>
          <span className="brand__name">
            珂拉课程表
            <small>clarkhub.cn</small>
          </span>
        </Link>

        <nav className={`site-nav ${isOpen ? 'site-nav--open' : ''}`} aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              className="site-nav__link"
              to={item.to}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          {isSignedIn ? (
            <Link className="btn btn--primary btn--sm" to={workspace}>
              进入{role === 'admin' ? '管理台' : '工作台'}
            </Link>
          ) : (
            <>
              <Link className="btn btn--ghost btn--sm" to="/login">
                登录
              </Link>
              <Link className="btn btn--primary btn--sm" to="/register">
                开始使用
              </Link>
            </>
          )}
          <button
            className="icon-button site-header__toggle"
            type="button"
            aria-label={isOpen ? '收起导航' : '展开导航'}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((value) => !value)}
          >
            <Icon name={isOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>
      {location.hash ? <span className="visually-hidden">已定位到页面内区块</span> : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__grid">
          <div>
            <Link className="brand" to="/">
              <span className="brand__mark">珂</span>
              <span className="brand__name">
                珂拉课程表
                <small>clarkhub.cn</small>
              </span>
            </Link>
            <p className="site-footer__about">
              把教务系统里的课表、手机里的课表截图，整理成一份随时能打开的课程表。
            </p>
          </div>

          <div className="site-footer__col">
            <h4>开始使用</h4>
            <ul>
              <li><Link to="/register">创建账号</Link></li>
              <li><Link to="/login">登录</Link></li>
              <li><Link to="/guide/import">教务导入</Link></li>
              <li><Link to="/guide/recognition">截图识别</Link></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4>使用指南</h4>
            <ul>
              <li><Link to="/guide/first-week">第一次使用的顺序</Link></li>
              <li><Link to="/guide/schedule">课表与周次</Link></li>
              <li><Link to="/guide/pickup">取件码怎么用</Link></li>
              <li><Link to="/guide/account">账号与登录码</Link></li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h4>更多</h4>
            <ul>
              <li><Link to="/#faq">常见问题</Link></li>
              <li><Link to="/admin">管理台</Link></li>
              <li><a href="https://github.com/TissyBoxC/Clark_AAMS" target="_blank" rel="noreferrer">项目主页</a></li>
            </ul>
          </div>
        </div>

        <div className="site-footer__base">
          <span>珂拉课程表 · 面向高校学生的课程表工作台</span>
          <span>课表数据保存在你自己的账号里，换设备登录即可取回。</span>
        </div>
      </div>
    </footer>
  );
}
