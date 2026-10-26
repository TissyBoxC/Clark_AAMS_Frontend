import { useEffect, useState } from 'react';

interface ILoadingViewPropsType {
  description?: string;
}

/** 超过这个时间才追加安抚文案——短等待时提前说「再等等」反而让人焦虑。 */
const REASSURE_DELAY_MS = 2000;

function LoadingView({ description = '正在打开你的课表...' }: ILoadingViewPropsType) {
  const [reassure, setReassure] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReassure(true), REASSURE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className='app-page-loading' role='status' aria-live='polite'>
      <div className='app-page-loading__card'>
        <div className='app-page-loading__eyebrow'>珂拉课程表</div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--title'></div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--copy'></div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--copy short'></div>
        <p>{description}</p>
        {reassure ? (
          <p className='app-page-loading__hint'>还在加载，网络慢一点时会久一些。</p>
        ) : null}
      </div>
    </div>
  );
}

export default LoadingView;
