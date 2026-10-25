/*
 * 按需加载并清洗保留的静态指南文章内容。
 * 通过 AbortController 避免路由切换后继续写入过期状态。
 */

import { useEffect, useState } from 'react';

import { extractGuideArticleHtml } from '../utils/html';

export interface IGuideArticleStateType {
  articleHtml: string;
  isLoading: boolean;
  errorMessage: string;
}

export function useGuideArticle(slug: string): IGuideArticleStateType {
  const [articleHtml, setArticleHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const abortController = new AbortController();

    async function loadArticle(): Promise<void> {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await fetch(`/legacy/user-guide/${slug}.html`, {
          cache: 'no-store',
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        setArticleHtml(extractGuideArticleHtml(text));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : '鎸囧崡鍐呭璇诲彇澶辫触');
        setArticleHtml('');
      } finally {
        setIsLoading(false);
      }
    }

    void loadArticle();

    return () => {
      abortController.abort();
    };
  }, [slug]);

  return {
    articleHtml,
    isLoading,
    errorMessage,
  };
}
