import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import SiteHeader from '../../components/SiteHeader';
import { GUIDE_ENTRIES, findGuideEntry, resolveGuideSlug } from '../../constants/guide-config';
import LoadingView from '../../components/LoadingView';
import { useBodyClass } from '../../hooks/useBodyClass';
import { useGuideArticle } from '../../hooks/useGuideArticle';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuthStore } from '../../store/auth-context';
import { qqAvatarUrl } from '../../utils/avatar';
import NotFoundPage from '../shared/not-found-page';

function GuideChevronIcon() {
  return (
    <svg className='guide-nav-chevron' viewBox='0 0 12 12' aria-hidden='true'>
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

function GuidePage() {
  const params = useParams<{ slug: string }>();
  const resolvedSlug = resolveGuideSlug(params.slug);
  const entry = findGuideEntry(params.slug);
  const { isAuthResolved, user } = useAuthStore();
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [expandedState, setExpandedState] = useState<{ slug: string; group: string | null }>({
    slug: resolvedSlug,
    group: entry?.group ?? GUIDE_ENTRIES[0]?.group ?? null,
  });

  const { articleHtml, errorMessage, isLoading } = useGuideArticle(resolvedSlug);

  useBodyClass('guide-page');
  usePageMeta(entry?.title || '用户指南', entry?.summary || '珂拉课程表 用户指南内容页。');

  const isLoggedIn = isAuthResolved && user.id > 0;
  const userHref = isLoggedIn ? '/user' : '/login';
  const userLabel = isLoggedIn ? user.username || user.email || '已登录' : '立即登录';
  const userAvatarUrl = isLoggedIn ? qqAvatarUrl(user.email) : '/site/logo.png';

  const groupedEntries = useMemo(() => {
    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const groups = new Map<string, Array<(typeof GUIDE_ENTRIES)[number]>>();

    GUIDE_ENTRIES.forEach((guideEntry) => {
      const isMatched = !normalizedKeyword || [guideEntry.title, guideEntry.summary, guideEntry.slug]
        .some((value) => value.toLowerCase().includes(normalizedKeyword));

      if (!isMatched) {
        return;
      }

      const currentGroupEntries = groups.get(guideEntry.group) ?? [];
      groups.set(guideEntry.group, [...currentGroupEntries, guideEntry]);
    });

    return Array.from(groups.entries());
  }, [searchKeyword]);

  if (!entry) {
    return <NotFoundPage />;
  }

  const expandedGroup = expandedState.slug === resolvedSlug ? expandedState.group : entry.group;
  const currentGroupEntryCount = GUIDE_ENTRIES.filter((guideEntry) => guideEntry.group === entry.group).length;

  return (
    <>
      <SiteHeader userHref={userHref} userLabel={userLabel} userAvatarUrl={userAvatarUrl} />

      <main className='guide-layout'>
        <aside className='guide-sidebar'>
          <div className='guide-sidebar__meta'>
            <p className='eyebrow'>{entry.group}</p>
            <p>{entry.summary}</p>
            <small>这一类共有 {currentGroupEntryCount} 篇</small>
          </div>
          <label className='guide-search-field'>
            <span className='guide-search-field__label'>搜索指南</span>
            <input
              className='guide-search'
              type='search'
              placeholder='输入关键词'
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </label>
          {searchKeyword ? (
            <div className='guide-search-meta'>已筛选出包含 “{searchKeyword}” 的内容</div>
          ) : null}

          <nav className='guide-nav' aria-label='用户指南目录'>
            {groupedEntries.map(([groupName, entries]) => {
              const isExpanded = expandedGroup === groupName;
              const isCurrentGroup = entry.group === groupName;

              return (
                <div key={groupName} className='guide-nav-collection'>
                  <button
                    className={`guide-nav-collection-toggle${isCurrentGroup ? ' is-current-group' : ''}`}
                    type='button'
                    aria-expanded={isExpanded}
                    onClick={() => {
                      setExpandedState({
                        slug: resolvedSlug,
                        group: expandedGroup === groupName ? null : groupName,
                      });
                    }}
                  >
                    <span>{groupName}</span>
                    <GuideChevronIcon />
                  </button>
                  <div className={`guide-nav-collapse${isExpanded ? ' is-expanded' : ''}`}>
                    <div className='guide-nav-collapse__inner guide-nav-collection-items'>
                      {entries.map((guideEntry) => (
                        <a
                          key={guideEntry.slug}
                          className={guideEntry.slug === resolvedSlug ? 'active' : ''}
                          href={`/docs/user-guide/${guideEntry.slug}`}
                          tabIndex={isExpanded ? undefined : -1}
                        >
                          {guideEntry.title.replace('用户指南 - ', '')}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {groupedEntries.length === 0 ? (
              <p className='guide-nav-empty'>
                没有找到包含 “{searchKeyword}” 的指南，换个词试试，或清空搜索看全部。
              </p>
            ) : null}
          </nav>
        </aside>

        <article className='guide-article'>
          {isLoading ? <LoadingView description='正在读取用户指南内容。' /> : null}
          {!isLoading && !errorMessage ? (
            <div className='guide-reading-intro'>
              <p className='eyebrow'>{entry.group}</p>
              <p>{entry.summary}</p>
            </div>
          ) : null}
          {!isLoading && errorMessage ? (
            <section className='guide-panel'>
              <h2>这篇指南暂时打不开</h2>
              <p>{errorMessage}</p>
              <p className='schedule-muted'>可以先回到目录看别的部分，或者稍后再打开这篇。</p>
              <div className='button-row'>
                <a className='button-secondary' href='/docs/user-guide/intro'>
                  回到指南首页
                </a>
              </div>
            </section>
          ) : null}
          {!isLoading && !errorMessage ? <div className='guide-reading-body' dangerouslySetInnerHTML={{ __html: articleHtml }}></div> : null}
        </article>
      </main>
    </>
  );
}

export default GuidePage;
