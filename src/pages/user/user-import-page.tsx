import { useEffect, useState } from 'react';

import { fetchAcademicImportSchools } from '../../api/school-api';
import LoadingView from '../../components/LoadingView';
import SupportFab from '../../components/SupportFab';
import UserWorkspaceShell from '../../components/UserWorkspaceShell';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useRequiredVerifiedUser } from '../../hooks/useRequiredVerifiedUser';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';
import type { ISchoolType } from '../../types/app-types';
import { userMessageFor } from '../../constants/error-codes';

function UserImportPage() {
  const navigate = useTransitionNavigate();
  const { user, isReady } = useRequiredVerifiedUser();
  const [schools, setSchools] = useState<ISchoolType[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoadingSchools, setIsLoadingSchools] = useState<boolean>(true);

  usePageMeta('教务导入 · 珂拉课程表', '从学校教务系统直接读取整学期课表。');

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let isMounted = true;

    async function loadSchools(): Promise<void> {
      try {
        const nextSchools = await fetchAcademicImportSchools();

        if (isMounted) {
          setSchools(nextSchools);
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage(userMessageFor(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingSchools(false);
        }
      }
    }

    void loadSchools();

    return () => {
      isMounted = false;
    };
  }, [isReady]);

  if (!isReady) {
    return <LoadingView description='正在读取你的账号...' />;
  }

  const currentUserLabel = user.username || '同学';
  const hasSchools = schools.length > 0;

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title='教务导入'
        description='登录学校教务系统，直接把整学期课表读过来，不用一节课一节课地填。'
        contentClassName='dashboard-content-wide'
      >
        <section className='surface-card workspace-card'>
          <div className='workspace-card__header'>
            <p className='eyebrow'>第一步</p>
            <h2>选你的学校</h2>
            <p>
              下面这些学校可以直接从教务系统读课表。
              导入过程中需要你在学校的登录页面填一次账号密码，那一步由学校页面自己完成，
              我们不会保存你的学校密码。
            </p>
          </div>

          <div className='import-school-list' id='import-school-list'>
            {isLoadingSchools && !statusMessage ? (
              <p className='schedule-muted'>正在读取支持的学校...</p>
            ) : null}

            {hasSchools
              ? schools.map((school) => (
                  <button
                    key={school.id}
                    className='school-option'
                    type='button'
                    onClick={() => navigate(`/course-import?schoolId=${encodeURIComponent(school.id)}`)}
                  >
                    <strong>{school.name}</strong>
                    <span>从这所学校的教务系统读取课表</span>
                  </button>
                ))
              : null}
          </div>

          {/* 空状态要说清为什么空、接下来能做什么，而不是留一片空白让人猜 */}
          {!isLoadingSchools && !statusMessage && !hasSchools ? (
            <div className='schedule-empty-block'>
              <p className='schedule-empty-title'>目前还没有可以一键导入的学校</p>
              <p className='schedule-empty-copy'>
                这不代表你的学校用不了珂拉课程表，只是还没接上自动导入。
                你可以把课表截个图，用图片识别导入，同样能得到完整课表。
              </p>
              <div className='button-row'>
                <a className='button-primary' href='/user/recognition'>
                  用截图识别课表
                </a>
                <a className='button-secondary' href='/user/schedule'>
                  手动添加课程
                </a>
              </div>
            </div>
          ) : null}

          <div className={`form-status${statusMessage ? ' error' : ''}`} id='import-school-status'>
            {statusMessage}
          </div>
        </section>

        <section className='surface-card workspace-card'>
          <div className='workspace-card__header'>
            <p className='eyebrow'>说明</p>
            <h2>导入前要知道的</h2>
          </div>

          <div className='workspace-points'>
            <div className='workspace-point'>
              <strong>什么时候需要手动登录</strong>
              <span>
                点进学校后会打开学校的登录页，用你自己的学号密码登录。
                如果学校页面要求验证码或手机确认，按它的提示操作即可。
              </span>
            </div>
            <div className='workspace-point'>
              <strong>导入结果先检查再保存</strong>
              <span>
                读回来的课表是一份草稿，确认名单和节次没串行再保存。
                保存后会存进你的账号，换设备登录一样能看到。
              </span>
            </div>
            <div className='workspace-point'>
              <strong>学校页面改版了怎么办</strong>
              <span>
                如果导入失败或读不到课程，多半是学校页面变了。
                这种情况先用截图识别，同时告诉我们，我们会尽快跟上。
              </span>
            </div>
          </div>

          <div className='workspace-directory-meta'>
            <div className='workspace-directory-meta__item'>
              <span>当前账号</span>
              <strong>{currentUserLabel}</strong>
            </div>
            <div className='workspace-directory-meta__item'>
              <span>可导入的学校</span>
              <strong>{isLoadingSchools ? '...' : `${schools.length} 所`}</strong>
            </div>
          </div>

          <div className='button-row'>
            <a className='button-secondary' href='/user'>
              回到今日概览
            </a>
            <a className='button-ghost' href='/docs/user-guide/import'>
              看导入步骤说明
            </a>
          </div>
        </section>
      </UserWorkspaceShell>

      <SupportFab />
    </>
  );
}

export default UserImportPage;
