import { useEffect, useState, type FormEvent } from 'react';

import type { ICoursePickupRecordType } from '../../types/app-types';

import { createAdminCoursePickup, deleteAdminCoursePickup, deleteAdminCoursePickupImage, fetchAdminCoursePickupDetail, fetchAdminCoursePickups, updateAdminCoursePickup } from '../../api/admin-api';
import { buildApiUrl } from '../../api/http';
import AdminLayout from '../../layouts/AdminLayout';
import { useBodyClass } from '../../hooks/useBodyClass';
import { usePageMeta } from '../../hooks/usePageMeta';
import { copyText } from '../../utils/clipboard';
import { formatJson } from '../../utils/json';

import styles from './admin-pages.module.css';
import { userMessageFor } from '../../constants/error-codes';

function buildPickupImageUrl(code: string, fileName: string): string {
  return buildApiUrl(`/api/v1/admin/course-pickups/${encodeURIComponent(code)}/images/${encodeURIComponent(fileName)}`);
}

function AdminPickupsPage() {
  const [records, setRecords] = useState<ICoursePickupRecordType[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ICoursePickupRecordType | null>(null);
  const [detailJsonText, setDetailJsonText] = useState<string>('');
  const [manualJsonText, setManualJsonText] = useState<string>('[]');
  const [manualStatus, setManualStatus] = useState<string>('取件码将由后端随机分配。');
  const [listStatus, setListStatus] = useState<string>('未加载');
  const [detailStatus, setDetailStatus] = useState<string>('请选择记录');

  useBodyClass('admin-route');
  usePageMeta('取件码管理', '维护网页识别生成的取件码记录与原始图片。');

  async function loadRecords(): Promise<void> {
    setListStatus('正在读取记录...');

    try {
      const nextRecords = await fetchAdminCoursePickups();
      setRecords(nextRecords || []);
      setListStatus(`已加载 ${nextRecords.length} 条记录`);
    } catch (error) {
      setRecords([]);
      setListStatus(userMessageFor(error));
    }
  }

  async function loadDetail(code: string): Promise<void> {
    setSelectedCode(code);
    setDetailStatus('正在读取详情...');

    try {
      const record = await fetchAdminCoursePickupDetail(code);
      setSelectedRecord(record);
      setDetailJsonText(formatJson(record.jsonText || '[]'));
      setDetailStatus(`已加载 ${record.code}`);
    } catch (error) {
      setSelectedRecord(null);
      setDetailJsonText('');
      setDetailStatus(userMessageFor(error));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  async function handleManualCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      const normalizedJsonText = formatJson(manualJsonText);
      JSON.parse(normalizedJsonText);
      const result = await createAdminCoursePickup(normalizedJsonText);
      setManualJsonText(normalizedJsonText);
      setManualStatus(`已生成取件码：${result.code}`);
      await loadRecords();
      await loadDetail(result.code);
    } catch (error) {
      setManualStatus(userMessageFor(error));
    }
  }

  async function handleSaveJson(): Promise<void> {
    if (!selectedRecord) {
      return;
    }

    try {
      const normalizedJsonText = formatJson(detailJsonText);
      JSON.parse(normalizedJsonText);
      await updateAdminCoursePickup(selectedRecord.code, normalizedJsonText);
      setDetailJsonText(normalizedJsonText);
      setDetailStatus('JSON 保存成功');
      await loadDetail(selectedRecord.code);
    } catch (error) {
      setDetailStatus(userMessageFor(error));
    }
  }

  async function handleDeleteRecord(): Promise<void> {
    if (!selectedRecord) {
      return;
    }

    try {
      await deleteAdminCoursePickup(selectedRecord.code);
      setSelectedCode('');
      setSelectedRecord(null);
      setDetailJsonText('');
      setDetailStatus('记录已删除');
      await loadRecords();
    } catch (error) {
      setDetailStatus(userMessageFor(error));
    }
  }

  async function handleDeleteImage(fileName: string): Promise<void> {
    if (!selectedRecord) {
      return;
    }

    try {
      await deleteAdminCoursePickupImage(selectedRecord.code, fileName);
      await loadDetail(selectedRecord.code);
    } catch (error) {
      setDetailStatus(userMessageFor(error));
    }
  }

  return (
    <AdminLayout
      title='取件码管理'
      description='管理网页识别生成的课程 JSON 记录与原始图片。'
      activeKey='pickups'
      badgeText={`${records.length} 条`}
    >
      <div className={styles.gridTwo}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>记录</h2>
              <p>手动新增课程 JSON 或选择现有取件码。</p>
            </div>
            <div className={styles.actions}>
              <button className={styles.buttonSecondary} type='button' onClick={() => void loadRecords()}>
                刷新
              </button>
            </div>
          </div>
          <div className={styles.panelBody}>
            <form className={styles.form} onSubmit={handleManualCreate}>
              <label className={styles.field}>
                <span>手动添加课程 JSON</span>
                <textarea className={styles.textarea} spellCheck={false} value={manualJsonText} onChange={(event) => setManualJsonText(event.target.value)}></textarea>
              </label>
              <div className={styles.actions}>
                <button className={styles.button} type='submit'>生成取件码</button>
                <button className={styles.buttonSecondary} type='button' onClick={() => setManualJsonText(formatJson(manualJsonText))}>
                  格式化
                </button>
              </div>
              <div className={styles.statusText}>{manualStatus}</div>
            </form>

            <div className={styles.statusText}>{listStatus}</div>
            <div className={styles.recordList}>
              {records.map((record) => (
                <button key={record.code} className={`${styles.recordButton} ${selectedCode === record.code ? styles.recordButtonActive : ''}`} type='button' onClick={() => void loadDetail(record.code)}>
                  <span className={styles.codeTag}>{record.code}</span>
                  <span className={styles.recordMeta}>{record.createdAt || '创建时间未知'}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>详情</h2>
              <p>编辑课程 JSON、复制取件码或删除记录。</p>
            </div>
            <span className={styles.statusText}>{detailStatus}</span>
          </div>
          <div className={styles.panelBody}>
            {!selectedRecord ? <div className={styles.emptyState}>从左侧选择一个取件码。</div> : null}
            {selectedRecord ? (
              <>
                <div className={styles.actions}>
                  <button className={styles.button} type='button' onClick={() => void handleSaveJson()}>
                    保存 JSON
                  </button>
                  <button className={styles.buttonSecondary} type='button' onClick={() => void copyText(selectedRecord.code)}>
                    复制取件码
                  </button>
                  <button className={styles.buttonDanger} type='button' onClick={() => void handleDeleteRecord()}>
                    删除记录
                  </button>
                </div>
                <label className={styles.field}>
                  <span>课程 JSON</span>
                  <textarea className={`${styles.textarea} ${styles.resultConsole}`} spellCheck={false} value={detailJsonText} onChange={(event) => setDetailJsonText(event.target.value)}></textarea>
                </label>
                <section className={styles.stack}>
                  <h3>图片</h3>
                  {selectedRecord.images.length === 0 ? <div className={styles.emptyState}>当前记录没有原始图片。</div> : null}
                  <div className={styles.imageGrid}>
                    {selectedRecord.images.map((image) => (
                      <div key={image.fileName} className={styles.imageItem}>
                        <img src={buildPickupImageUrl(selectedRecord.code, image.fileName)} alt='' />
                        <div className={styles.recordMeta}>{image.originalName || image.fileName}</div>
                        <button className={styles.buttonDanger} type='button' onClick={() => void handleDeleteImage(image.fileName)}>
                          删除图片
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPickupsPage;
