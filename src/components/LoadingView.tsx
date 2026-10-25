interface ILoadingViewPropsType {
  description?: string;
}

function LoadingView({ description = '正在准备页面内容，请稍候。' }: ILoadingViewPropsType) {
  return (
    <div className='app-page-loading'>
      <div className='app-page-loading__card'>
        <div className='app-page-loading__eyebrow'>Loading workspace</div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--title'></div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--copy'></div>
        <div className='app-page-loading__skeleton app-page-loading__skeleton--copy short'></div>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default LoadingView;
