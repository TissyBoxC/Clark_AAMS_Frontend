import { Link, useParams } from 'react-router-dom';

import SiteHeader, { SiteFooter } from '../../components/SiteChrome';
import { PageMeta } from '../../components/ui';
import { GUIDE_ARTICLES, findArticle } from './guide-content';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = findArticle(slug) ?? GUIDE_ARTICLES[0];
  const groups = Array.from(new Set(GUIDE_ARTICLES.map((item) => item.group)));

  return (
    <>
      <PageMeta
        title={`${article.title} · 珂拉课程表使用指南`}
        description={article.summary}
      />
      <SiteHeader />

      <main className="doc">
        <div className="shell">
          <div className="doc__grid">
            <nav className="doc__toc" aria-label="指南目录">
              {groups.map((group) => (
                <div key={group}>
                  <p className="tiny" style={{ padding: '0.5rem 0.6rem 0.2rem' }}>{group}</p>
                  {GUIDE_ARTICLES.filter((item) => item.group === group).map((item) => (
                    <Link
                      key={item.slug}
                      to={`/guide/${item.slug}`}
                      aria-current={item.slug === article.slug ? 'page' : undefined}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>

            <article className="doc__article">
              <p className="tiny">
                {article.group} · 阅读约 {article.readTime}
              </p>
              <h1>{article.title}</h1>
              <p className="lede" style={{ marginBottom: '1.5rem' }}>{article.summary}</p>

              {article.blocks.map((block, index) => {
                const key = `${article.slug}-${index}`;

                if (block.type === 'h2') {
                  return <h2 key={key}>{block.text}</h2>;
                }

                if (block.type === 'ul' || block.type === 'ol') {
                  const ListTag = block.type === 'ul' ? 'ul' : 'ol';
                  return (
                    <ListTag key={key}>
                      {(block.items ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ListTag>
                  );
                }

                if (block.type === 'note') {
                  return (
                    <div className="notice notice--amber" key={key} style={{ margin: '1rem 0' }}>
                      <span>{block.text}</span>
                    </div>
                  );
                }

                return <p key={key}>{block.text}</p>;
              })}

              <hr className="divider" />
              <div className="row">
                <Link className="btn btn--soft btn--sm" to="/guide">回到指南目录</Link>
                <Link className="btn btn--ghost btn--sm" to="/user/schedule">打开我的课表</Link>
              </div>
            </article>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
