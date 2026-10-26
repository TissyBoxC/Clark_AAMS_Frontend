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

  usePageMeta('教务导入', '选择支持的学校，进入独立的教务导入与课程解析流程。');

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
      }
    }

    void loadSchools();

    return () => {
      isMounted = false;
    };
  }, [isReady]);

  if (!isReady) {
    return <LoadingView description='正在确认邮箱验证状态。' />;
  }

  const currentUserLabel = user.username || `用户 ${user.id}`;

  return (
    <>
      <UserWorkspaceShell
        user={user}
        title='教务导入'
        description='选择支持的学校，进入独立的教务导入与课程解析流程。'
        contentClassName='dashboard-content-wide'
      >
        <div className='workspace-layout'>
          <section className='surface-card workspace-card user-workspace-summary'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>教务导入</p>
              <h2>选择学校并开始导入</h2>
              <p>这里集中展示当前支持的学校入口。选择后会跳转到对应的导入页，在浏览器内完成登录和课程数据解析。</p>
            </div>

            <div className='workspace-points'>
              <div className='workspace-point'>
                <strong>独立流程更清晰</strong>
                <span>学校选择、网页登录和课程导入拆分展示，避免和用户总览页面混在一起。</span>
              </div>
              <div className='workspace-point'>
                <strong>学校配置实时读取</strong>
                <span>学校列表直接来自后端可用配置，看到的就是当前实际支持的导入入口。</span>
              </div>
            </div>

            <div className='workspace-directory-meta'>
              <div className='workspace-directory-meta__item'>
                <span>当前用户</span>
                <strong>{currentUserLabel}</strong>
              </div>
              <div className='workspace-directory-meta__item'>
                <span>支持学校</span>
                <strong>{schools.length || 0} 所</strong>
              </div>
            </div>

            <div className='button-row'>
              <a className='button-secondary' href='/user'>
                返回用户中心
              </a>
              <a className='button-ghost' href='/docs/user-guide/import'>
                查看导入指南
              </a>
            </div>
          </section>

          <section className='surface-card workspace-card'>
            <div className='workspace-card__header'>
              <p className='eyebrow'>学校列表</p>
              <h2>可用学校</h2>
              <p id='import-user-summary'>当前登录用户：{currentUserLabel}。选择学校后将进入对应的独立导入页面。</p>
            </div>

            <div className='import-school-list' id='import-school-list'>
              {!statusMessage && schools.length === 0 ? <span>正在读取学校列表。</span> : null}
              {schools.length > 0
                ? schools.map((school) => (
                    <button
                      key={school.id}
                      className='school-option'
                      type='button'
                      onClick={() => navigate(`/course-import?schoolId=${encodeURIComponent(school.id)}`)}
                    >
                      <strong>{school.name}</strong>
                      <span>{school.login?.loginUrl || '点击进入对应导入页面。'}</span>
                    </button>
                  ))
                : null}
            </div>

            <div className={`form-status${statusMessage ? ' error' : ''}`} id='import-school-status'>
              {statusMessage || '如果没有你的学校，说明这所学校还没有接进来。可以先用图片识别导入课表。'}
            </div>
          </section>
        </div>
      </UserWorkspaceShell>

      <SupportFab />
    </>
  );
}

export default UserImportPage;
