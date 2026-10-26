import { useEffect, useMemo, useState } from 'react';

import type { IAdminAiConfigType, IAdminAppVersionConfigType, IAdminEmailConfigType, IHealthStatusType, ISchoolType } from '../../types/app-types';

import { fetchAdminAiConfig, fetchAdminCoursePickups, fetchAdminEmailConfig, fetchAdminVersionConfig, fetchHealthStatus } from '../../api/admin-api';
import { fetchSchools } from '../../api/school-api';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';

import styles from './admin-pages.module.css';

function AdminDashboardPage() {
  const [healthStatus, setHealthStatus] = useState<string>('检查中');
  const [pickupsCount, setPickupsCount] = useState<string>('加载中');
  const [schoolsState, setSchoolsState] = useState<string>('加载中');
  const [latestVersion, setLatestVersion] = useState<string>('加载中');
  const [minimumVersion, setMinimumVersion] = useState<string>('加载中');
  const [aiState, setAiState] = useState<string>('加载中');
  const [emailState, setEmailState] = useState<string>('加载中');
  const [loadSummary, setLoadSummary] = useState<string>('正在读取当前状态...');

  useBodyClass('admin-route');
  usePageMeta('管理台', '珂拉课程表 后台概览页。');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard(): Promise<void> {
      const [healthResult, versionResult, aiResult, emailResult, pickupResult, schoolResult] = await Promise.allSettled([
        fetchHealthStatus(),
        fetchAdminVersionConfig(),
        fetchAdminAiConfig(),
        fetchAdminEmailConfig(),
        fetchAdminCoursePickups(),
        fetchSchools(),
      ]);

      if (!isMounted) {
        return;
      }

      if (healthResult.status === 'fulfilled') {
        const healthData = healthResult.value as IHealthStatusType;
        setHealthStatus(healthData.status || 'UP');
      } else {
        setHealthStatus('离线');
      }

      if (schoolResult.status === 'fulfilled') {
        const schools = schoolResult.value as ISchoolType[];
        setSchoolsState(`${schools.length} 所学校`);
      } else {
        setSchoolsState('不可用');
      }

      if (versionResult.status === 'fulfilled') {
        const versionConfig = versionResult.value as IAdminAppVersionConfigType;
        setLatestVersion(`${versionConfig.latestVersion} (${versionConfig.latestBuild})`);
        setMinimumVersion(`${versionConfig.minimumSupportedVersion} (${versionConfig.minimumSupportedBuild})`);
      } else {
        setLatestVersion('不可用');
        setMinimumVersion('不可用');
      }

      if (aiResult.status === 'fulfilled') {
        const aiConfig = aiResult.value as IAdminAiConfigType;
        setAiState(aiConfig.apiKeyConfigured ? '已保存' : '还没有填写访问密钥');
      } else {
        setAiState('不可用');
      }

      if (emailResult.status === 'fulfilled') {
        const emailConfig = emailResult.value as IAdminEmailConfigType;
        setEmailState(
          !emailConfig.apiKeyConfigured
            ? '还没有填写访问密钥'
            : emailConfig.enabled
              ? '已启用'
              : '已配置未启用',
        );
      } else {
        setEmailState('不可用');
      }

      if (pickupResult.status === 'fulfilled') {
        setPickupsCount(`${pickupResult.value.length} 条`);
      } else {
        setPickupsCount('不可用');
      }

      setLoadSummary('概览数据已刷新。');
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const badgeText = useMemo(() => healthStatus, [healthStatus]);

  return (
    <AdminLayout
      title='珂拉课程表 管理台'
      description='学校、版本、识别和取件码的统一入口。'
      activeKey='dashboard'
      badgeText={badgeText}
    >
      <div className={styles.pageGrid}>
        <section className={`${styles.panel} ${styles.heroCard}`}>
          <div>
            <p className={styles.eyebrow}>管理概览</p>
            <h2>后台能力概览</h2>
            <p className={styles.statusText}>这里保留各模块当前状态，具体操作入口统一放在右侧菜单栏，避免首页重复出现跳转按钮。</p>
          </div>
          <div className={styles.heroSummary}>
            <div className={styles.heroMetric}>
              <span>服务状态</span>
              <strong className={styles.metricValue}>{healthStatus}</strong>
            </div>
            <div className={styles.heroMetric}>
              <span>取件码记录</span>
              <strong className={styles.metricValue}>{pickupsCount}</strong>
            </div>
          </div>
          <div className={styles.statusText}>{loadSummary}</div>
        </section>

        <section className={styles.opsRail} aria-label='后台关键路径'>
          <article>
            <span>01</span>
            <strong>先确认服务健康</strong>
            <p>健康检查失败时，其他配置都不应继续操作。</p>
          </article>
          <article>
            <span>02</span>
            <strong>再维护学校与版本</strong>
            <p>学校导入和移动端版本策略决定用户能否顺利进入主流程。</p>
          </article>
          <article>
            <span>03</span>
            <strong>最后观察 AI 与取件码</strong>
            <p>识别设置和取件码记录能看出识别是否稳定。</p>
          </article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>模块状态</h2>
              <p>显示当前的运行状态</p>
            </div>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.statusGrid}>
              <article className={styles.statusItem}>
                <span>学校管理</span>
                <strong>{schoolsState}</strong>
                <p>学校列表与导入能力。</p>
              </article>
              <article className={styles.statusItem}>
                <span>版本管理</span>
                <strong>{latestVersion}</strong>
                <p>最低支持：{minimumVersion}</p>
              </article>
              <article className={styles.statusItem}>
                <span>AI 识别配置</span>
                <strong>{aiState}</strong>
                <p>识别模型与访问密钥的当前状态。</p>
              </article>
              <article className={styles.statusItem}>
                <span>邮箱验证配置</span>
                <strong>{emailState}</strong>
                <p>验证码发送服务和密钥状态。</p>
              </article>
              <article className={styles.statusItem}>
                <span>取件码管理</span>
                <strong>{pickupsCount}</strong>
                <p>网页识别结果和原始图片管理。</p>
              </article>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboardPage;
