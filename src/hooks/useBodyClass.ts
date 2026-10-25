/*
 * 为当前路由挂载 body class，并在组件卸载时自动移除。
 * 通过序列化依赖项，避免可变参数数组导致 effect 反复抖动。
 */

import { useEffect } from 'react';

export function useBodyClass(...classNames: string[]): void {
  const normalizedClassNames = classNames
    .map((className) => className.trim())
    .filter(Boolean);
  const serializedClassNames = normalizedClassNames.join(' ');

  useEffect(() => {
    const normalizedClassNames = serializedClassNames
      .split(/\s+/)
      .map((className) => className.trim())
      .filter(Boolean);

    if (normalizedClassNames.length === 0) {
      return undefined;
    }

    document.body.classList.add(...normalizedClassNames);

    return () => {
      document.body.classList.remove(...normalizedClassNames);
    };
  }, [serializedClassNames]);
}
