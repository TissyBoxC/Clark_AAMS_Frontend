import { useEffect, useMemo, useState } from 'react';

import {
  createPickupRecord,
  deletePickupImage,
  deletePickupRecord,
  fetchPickupRecords,
  updatePickupRecord,
} from '../../api/admin';
import AdminShell from '../../components/AdminShell';
import { EmptyState, Loading, PageMeta } from '../../components/ui';
import { useConfirm } from '../../components/useConfirm';
import { useToast } from '../../components/useToast';
import { userMessageFor } from '../../lib/errors';
import { formatDateTime } from '../../lib/schedule';
import type { IPickupRecordType } from '../../types';

function courseCountOf(record: IPickupRecordType): string {
  try {
    const parsed: unknown = JSON.parse(record.jsonText);
    if (Array.isArray(parsed)) {
      return `${parsed.length} 门`;
    }
    return '—';
  } catch {
    return '—';
  }
}

export default function AdminPickupsPage() {
  const { notify } = useToast();
  const { confirm, confirmElement } = useConfirm();

  const [records, setRecords] = useState<IPickupRecordType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const filtered = useMemo(() => {
    const keyword = query.trim().toUpperCase();
    if (!keyword) {
      return records;
    }
    return records.filter((item) => item.code.toUpperCase().includes(keyword));
  }, [query, records]);

  const activeRecord = records.find((item) => item.code === activeCode) ?? null;

  async function load(): Promise<void> {
    try {
      const list = await fetchPickupRecords();
      setRecords(list);
      setError('');
    } catch (loadError) {
      setError(userMessageFor(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const list = await fetchPickupRecords();
        if (!cancelled) {
          setRecords(list);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(userMessageFor(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(): Promise<void> {
    setDialogError('');

    if (draft.trim().length < 4) {
      setDialogError('至少写一门课，例如「高等数学 周一 第1-2节 A101」。');
      return;
    }

    const lines = draft
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const courses = lines.map((line) => {
      const parts = line.split(/\s+/);
      const name = parts[0] ?? '';
      const dayText = parts[1] ?? '';
      const lessonText = parts[2] ?? '';
      const location = parts.slice(3).join(' ');

      const dayMap: Record<string, number> = {
        周一: 1, 周二: 2, 周三: 3, 周四: 4, 周五: 5, 周六: 6, 周日: 7,
      };
      const lessonMatch = lessonText.match(/(\d+)(?:\s*[-~到]\s*(\d+))?/);
      const start = lessonMatch ? Number(lessonMatch[1]) : 1;
      const end = lessonMatch && lessonMatch[2] ? Number(lessonMatch[2]) : start;

      return {
        name,
        dayOfWeek: dayMap[dayText] ?? 1,
        startLesson: start,
        endLesson: end,
        location,
        teacher: '',
        weeks: [],
        weekRanges: [[1, 16]],
        weekRule: 'ALL',
      };
    });

    setIsSaving(true);
    try {
      const created = await createPickupRecord(JSON.stringify(courses));
      await load();
      setActiveCode(created.code);
      setIsCreating(false);
      setDraft('');
      notify(`取件码 ${created.code} 已创建`, 'success');
    } catch (createError) {
      setDialogError(userMessageFor(createError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEdit(): Promise<void> {
    if (!activeRecord) {
      return;
    }
    setIsSaving(true);
    try {
      await updatePickupRecord(activeRecord.code, activeRecord.jsonText);
      await load();
      notify('课程内容已更新', 'success');
    } catch (saveError) {
      notify(userMessageFor(saveError), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(code: string): Promise<void> {
    const confirmed = await confirm({
      title: '删除这条取件码？',
      body: (
        <p>
          删除后取件码 {code} 立刻失效，拿到它的人也取不到内容了。
          这一步无法撤销。
        </p>
      ),
      confirmText: '删除取件码',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deletePickupRecord(code);
      if (activeCode === code) {
        setActiveCode('');
      }
      await load();
      notify('取件码已删除', 'success');
    } catch (deleteError) {
      notify(userMessageFor(deleteError), 'error');
    }
  }

  async function handleDeleteImage(code: string, fileName: string): Promise<void> {
    const confirmed = await confirm({
      title: '删除这张图片？',
      body: <p>删除后这份取件码里不再包含 {fileName}，其它内容不受影响。</p>,
      confirmText: '删除图片',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deletePickupImage(code, fileName);
      await load();
      notify('图片已删除', 'success');
    } catch (deleteError) {
      notify(userMessageFor(deleteError), 'error');
    }
  }

  return (
    <AdminShell
      title="取件码记录"
      description="学生识别或导入后生成的取件码都在这里。内容可以修正，也能转给需要的人。"
      actions={(
        <button className="a-btn a-btn--primary" type="button" onClick={() => { setIsCreating(true); setDialogError(''); }}>
          新建取件码
        </button>
      )}
    >
      <PageMeta title="取件码记录 · 珂拉课程表管理台" description="查看、修正与删除取件码内容。" />

      <section className="a-card">
        <div className="a-card__head">
          <div>
            <h2 className="a-card__title">查找</h2>
            <p className="a-card__sub">按取件码查一条记录，支持只输入前几位。</p>
          </div>
        </div>
        <div className="row">
          <input
            className="a-input"
            style={{ maxWidth: 280 }}
            value={query}
            aria-label="按取件码查找"
            placeholder="例如 7K2M"
            onChange={(event) => setQuery(event.target.value.toUpperCase())}
          />
          <button className="a-btn" type="button" onClick={() => setQuery(query.trim())}>
            查找取件码
          </button>
          {query ? (
            <button className="a-btn a-btn--quiet" type="button" onClick={() => setQuery('')}>
              清除查找条件
            </button>
          ) : null}
        </div>
      </section>

      {error ? <div className="a-note a-note--bad">{error}</div> : null}

      {isLoading ? (
        <div className="a-card">
          <Loading text="正在读取取件码…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="a-card">
          <EmptyState
            title={records.length === 0 ? '还没有取件码记录' : '没有匹配的取件码'}
            action={(
              <button className="a-btn" type="button" onClick={() => { setIsCreating(true); setDialogError(''); }}>
                新建取件码
              </button>
            )}
          >
            {records.length === 0
              ? '取件码一般由学生在识别或导入后自动生成。需要提前准备一份时，可以在这里手动新建。'
              : '换个关键词再找一次，或者清除查找条件查看全部记录。'}
          </EmptyState>
        </div>
      ) : (
        <section className="a-card">
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>取件码</th>
                  <th>课程</th>
                  <th>图片</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.code}>
                    <td><strong>{record.code}</strong></td>
                    <td>{courseCountOf(record)}</td>
                    <td>{record.images?.length ?? 0} 张</td>
                    <td>{formatDateTime(record.updatedAt ?? record.createdAt)}</td>
                    <td>
                      <div className="row" style={{ gap: '0.35rem' }}>
                        <button className="a-btn" type="button" onClick={() => setActiveCode(record.code)}>
                          查看内容
                        </button>
                        <button className="a-btn a-btn--danger" type="button" onClick={() => void handleDelete(record.code)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeRecord ? (
        <div className="overlay" role="presentation" onClick={() => setActiveCode('')}>
          <div
            className="dialog dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog__head">
              <div>
                <h2 className="dialog__title" id="pickup-detail-title">取件码 {activeRecord.code}</h2>
                <p className="tiny" style={{ marginTop: '0.3rem' }}>
                  这里是记录里保存的课程内容，可以直接改成需要的样子再保存。
                </p>
              </div>
              <button className="icon-button" type="button" aria-label="关闭" onClick={() => setActiveCode('')}>
                ✕
              </button>
            </div>

            <div className="dialog__body">
              <div className="field">
                <label className="field__label" htmlFor="pickup-json">课程内容</label>
                <textarea
                  id="pickup-json"
                  className="textarea"
                  style={{ minHeight: 220, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                  value={activeRecord.jsonText}
                  onChange={(event) => {
                    const next = event.target.value;
                    setRecords((current) => current.map((item) => (
                      item.code === activeRecord.code ? { ...item, jsonText: next } : item
                    )));
                  }}
                />
              </div>

              <div>
                <span className="field__label">附带图片</span>
                {activeRecord.images?.length ? (
                  <div className="stack gap-2" style={{ marginTop: '0.5rem' }}>
                    {activeRecord.images.map((image) => (
                      <div className="file-row" key={image.fileName}>
                        {image.originalName || image.fileName}
                        <span>{image.size ? `${Math.max(1, Math.round(image.size / 1024))} KB` : ''}</span>
                        <button
                          className="btn btn--danger btn--sm"
                          type="button"
                          onClick={() => void handleDeleteImage(activeRecord.code, image.fileName)}
                        >
                          删除图片
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="tiny" style={{ marginTop: '0.35rem' }}>这条记录没有附带图片。</p>
                )}
              </div>
            </div>

            <div className="dialog__foot">
              <button className="btn btn--danger btn--sm" type="button" onClick={() => void handleDelete(activeRecord.code)}>
                删除取件码
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => setActiveCode('')}>
                关闭
              </button>
              <button className="btn btn--primary" type="button" disabled={isSaving} onClick={() => void handleSaveEdit()}>
                {isSaving ? '正在保存…' : '保存内容'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreating ? (
        <div className="overlay" role="presentation" onClick={() => setIsCreating(false)}>
          <div
            className="dialog dialog--wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pickup-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog__head">
              <div>
                <h2 className="dialog__title" id="pickup-create-title">新建取件码</h2>
                <p className="tiny" style={{ marginTop: '0.3rem' }}>
                  每行写一门课，格式：课程名 周一 第1-2节 A101。地点可以不写。
                </p>
              </div>
              <button className="icon-button" type="button" aria-label="关闭" onClick={() => setIsCreating(false)}>
                ✕
              </button>
            </div>

            <div className="dialog__body">
              <div className="field">
                <label className="field__label" htmlFor="pickup-new">课程内容</label>
                <textarea
                  id="pickup-new"
                  className="textarea"
                  value={draft}
                  placeholder={'高等数学 周一 第1-2节 A101\n大学英语 周三 第3-4节 B204'}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </div>

              {dialogError ? (
                <div className="notice notice--danger">
                  <span>{dialogError}</span>
                </div>
              ) : null}
            </div>

            <div className="dialog__foot">
              <button className="btn btn--ghost" type="button" onClick={() => setIsCreating(false)}>
                取消
              </button>
              <button className="btn btn--primary" type="button" disabled={isSaving} onClick={() => void handleCreate()}>
                {isSaving ? '正在创建…' : '创建取件码'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmElement}
    </AdminShell>
  );
}
