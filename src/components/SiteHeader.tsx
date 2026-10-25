import { useState } from 'react';

import { GUIDE_ENTRIES } from '../constants/guide-config';
import type { IGuideEntryType } from '../types/app-types';

interface ISiteHeaderPropsType {
  userHref?: string;
  userLabel?: string;
  userAvatarUrl?: string;
  showUserEntry?: boolean;
}

const GUIDE_MENU_GROUPS = Array.from(
  GUIDE_ENTRIES.reduce<Map<string, IGuideEntryType[]>>((accumulator, entry) => {
    const currentEntries = accumulator.get(entry.group) ?? [];
    accumulator.set(entry.group, [...currentEntries, entry]);
    return accumulator;
  }, new Map<string, IGuideEntryType[]>()),
).map(([groupName, entries]) => ({
  groupName,
  entries,
}));

function GuideMenuChevron() {
  return (
    <svg className='home-nav-guide__chevron' viewBox='0 0 12 12' aria-hidden='true'>
      <path
        d='M2.5 4.5 6 8l3.5-3.5'
        fill='none'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1.5'
      />
    </svg>
  );
}

function SiteHeader({
  userHref = '/login',
  userLabel = '立即登录',
  userAvatarUrl = '/site/logo.png',
  showUserEntry = true,
}: ISiteHeaderPropsType) {
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState<boolean>(false);

  return (
    <header className='home-topbar'>
      <div className='page-shell home-nav'>
        <a className='brand' href='/' aria-label='Clark AAMS 首页'>
          <img src='/site/logo.png' alt='' />
          <span className='brand-lockup'>
            <strong className='brand-title'>Clark AAMS</strong>
            <small className='brand-domain'>clarkhub.cn</small>
          </span>
        </a>
        <nav className='home-nav-links' aria-label='主导航'>
          <div
            className='home-nav-guide'
            onMouseEnter={() => setIsGuideMenuOpen(true)}
            onMouseLeave={() => setIsGuideMenuOpen(false)}
            onFocusCapture={() => setIsGuideMenuOpen(true)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget;

              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setIsGuideMenuOpen(false);
              }
            }}
          >
            <button
              className='home-nav-guide__trigger'
              type='button'
              aria-haspopup='true'
              aria-expanded={isGuideMenuOpen}
              onClick={() => setIsGuideMenuOpen((previous) => !previous)}
            >
              <span>指南</span>
              <GuideMenuChevron />
            </button>

            <div className={`home-nav-guide__panel${isGuideMenuOpen ? ' is-open' : ''}`}>
              <div className='home-nav-guide__grid'>
                {GUIDE_MENU_GROUPS.map(({ groupName, entries }) => (
                  <section key={groupName} className='home-nav-guide__column' aria-label={groupName}>
                    <p className='home-nav-guide__group'>{groupName}</p>
                    <div className='home-nav-guide__entries'>
                      {entries.map((entry) => (
                        <a
                          key={entry.slug}
                          className='home-nav-guide__entry'
                          href={`/docs/user-guide/${entry.slug}`}
                        >
                          <strong>{entry.title.replace('用户指南 - ', '')}</strong>
                          <small>{entry.summary}</small>
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </nav>
        {showUserEntry ? (
          <a className='home-user-link' href={userHref} aria-label='进入用户中心'>
            <img id='home-user-avatar' src={userAvatarUrl} alt='' />
            <span className='home-user-meta'>
              <strong id='home-user-label'>{userLabel}</strong>
            </span>
          </a>
        ) : null}
      </div>
    </header>
  );
}

export default SiteHeader;
