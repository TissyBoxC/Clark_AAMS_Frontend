interface IPageFooterPropsType {
  leftText: string;
  middleText?: string;
  rightHref?: string;
  rightLabel?: string;
}

function PageFooter({
  leftText,
  middleText,
  rightHref,
  rightLabel,
}: IPageFooterPropsType) {
  return (
    <footer className='page-footer'>
      <div className='page-footer__copy'>
        <span className='page-footer__title'>{leftText}</span>
        <span className='page-footer__domain'>clarkhub.cn</span>
        {middleText ? <span className='page-footer__subtitle'>{middleText}</span> : null}
      </div>
      {rightHref && rightLabel ? (
        <div className='page-footer__actions'>
          <a href={rightHref}>{rightLabel}</a>
        </div>
      ) : null}
    </footer>
  );
}

export default PageFooter;
