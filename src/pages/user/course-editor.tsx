import { useState } from 'react';

import type { ICourseUpsertPayloadType } from '../../api/course-api';
import {
  buildCoursePayload,
  emptyCourseForm,
  formatWeekSummary,
  isCourseFormValid,
  valuesFromCourse,
  type ICourseFormValuesType,
  type WeekModeType,
} from '../../utils/course-form';
import type { ICourseType } from '../../types/schedule-types.ts';
import { userMessageFor } from '../../constants/error-codes';

/*
 * 手工新增 / 编辑课程的表单（P3-3）。
 *
 * 这是 Web 与 App 的最后一个能力差距：App 早就能手工加课改课，
 * Web 之前只能删除和清空——用户从 App 换到 Web 就做不了同一件事。
 *
 * 表单本身只负责收集输入，载荷构造交给 `utils/course-form`，
 * 因为「三套周次表达不能自相矛盾」这类逻辑必须有测试盖住，
 * 而它不需要浏览器就能测。
 */

const WEEKDAY_OPTIONS = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
  { value: 7, label: '周日' },
];

const WEEK_MODE_OPTIONS: { value: WeekModeType; label: string }[] = [
  { value: 'all', label: '每周' },
  { value: 'odd', label: '单周' },
  { value: 'even', label: '双周' },
];

export interface ICourseEditorPropsType {
  /** 传入表示编辑该课程；不传表示新增。 */
  course?: ICourseType | null;
  onSubmit: (payload: ICourseUpsertPayloadType) => Promise<void>;
  onCancel: () => void;
}

export function CourseEditor({ course, onSubmit, onCancel }: ICourseEditorPropsType) {
  const [values, setValues] = useState<ICourseFormValuesType>(() =>
    course
      ? valuesFromCourse({
          name: course.name,
          dayOfWeek: course.dayOfWeek,
          startLesson: course.startLesson,
          endLesson: course.endLesson,
          location: course.location,
          teacher: course.teacher,
          // 周次唯一真相源是 weekPattern（与 App 一致），不是 weekRanges/weekRule
          weekRanges: course.weekPattern?.ranges?.map(
            (range) => [range.start, range.end] as [number, number],
          ),
          weekRule: course.weekPattern?.rule,
        })
      : emptyCourseForm(),
  );
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canSubmit = isCourseFormValid(values) && !isSubmitting;

  function patch<K extends keyof ICourseFormValuesType>(
    key: K,
    value: ICourseFormValuesType[K],
  ): void {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit(buildCoursePayload(values));
    } catch (submitError) {
      setError(userMessageFor(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className='course-editor' onSubmit={(event) => void handleSubmit(event)}>
      <h3 className='course-editor__title'>{course ? '编辑课程' : '新增课程'}</h3>

      <label className='course-editor__field'>
        <span>课程名称</span>
        <input
          type='text'
          value={values.name}
          placeholder='例如：高等数学'
          required
          onChange={(event) => patch('name', event.target.value)}
        />
      </label>

      <div className='course-editor__row'>
        <label className='course-editor__field'>
          <span>星期</span>
          <select
            value={values.dayOfWeek}
            onChange={(event) => patch('dayOfWeek', Number(event.target.value))}
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className='course-editor__field'>
          <span>开始节次</span>
          <input
            type='number'
            min={1}
            max={12}
            value={values.startLesson}
            onChange={(event) => patch('startLesson', Number(event.target.value))}
          />
        </label>

        <label className='course-editor__field'>
          <span>结束节次</span>
          <input
            type='number'
            min={1}
            max={12}
            value={values.endLesson}
            onChange={(event) => patch('endLesson', Number(event.target.value))}
          />
        </label>
      </div>

      <div className='course-editor__row'>
        <label className='course-editor__field'>
          <span>起始周</span>
          <input
            type='number'
            min={1}
            max={30}
            value={values.rangeStart}
            onChange={(event) => patch('rangeStart', Number(event.target.value))}
          />
        </label>

        <label className='course-editor__field'>
          <span>结束周</span>
          <input
            type='number'
            min={1}
            max={30}
            value={values.rangeEnd}
            onChange={(event) => patch('rangeEnd', Number(event.target.value))}
          />
        </label>

        <label className='course-editor__field'>
          <span>周次</span>
          <select
            value={values.weekMode}
            onChange={(event) => patch('weekMode', event.target.value as WeekModeType)}
          >
            {WEEK_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className='course-editor__row'>
        <label className='course-editor__field'>
          <span>地点（可选）</span>
          <input
            type='text'
            value={values.location}
            placeholder='例如：A101'
            onChange={(event) => patch('location', event.target.value)}
          />
        </label>

        <label className='course-editor__field'>
          <span>教师（可选）</span>
          <input
            type='text'
            value={values.teacher}
            placeholder='例如：张老师'
            onChange={(event) => patch('teacher', event.target.value)}
          />
        </label>
      </div>

      <p className='course-editor__summary'>上课时间：{formatWeekSummary(values)}</p>
      {error ? <p className='course-editor__error'>{error}</p> : null}
      {/* 按钮灰着的时候要说清缺什么，否则用户只能一个个字段去猜 */}
      {!values.name.trim() ? (
        <p className='course-editor__summary'>填上课程名称就能保存了。</p>
      ) : null}

      <div className='course-editor__actions'>
        <button type='submit' className='button-primary' disabled={!canSubmit}>
          {isSubmitting ? '正在保存…' : '保存课程'}
        </button>
        <button type='button' className='button-ghost' onClick={onCancel} disabled={isSubmitting}>
          取消
        </button>
      </div>
    </form>
  );
}
