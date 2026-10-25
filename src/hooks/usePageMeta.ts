/*
 * 让页面标题和描述与当前路由保持同步。
 * 当 description 标签缺失时按需创建，保证静态页和 SPA 页行为一致。
 */

import { useEffect } from 'react';

import { SITE_NAME } from '../constants/site-config';

export function usePageMeta(title: string, description: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const createdMetaDescription = metaDescription
      ? null
      : document.createElement('meta');
    const previousDescription = metaDescription?.content ?? '';

    if (createdMetaDescription) {
      createdMetaDescription.name = 'description';
      document.head.appendChild(createdMetaDescription);
      metaDescription = createdMetaDescription;
    }

    document.title = `${title} | ${SITE_NAME}`;

    if (metaDescription) {
      metaDescription.content = description;
    }

    return () => {
      document.title = previousTitle;

      if (metaDescription) {
        metaDescription.content = previousDescription;
      }

      createdMetaDescription?.remove();
    };
  }, [description, title]);
}
