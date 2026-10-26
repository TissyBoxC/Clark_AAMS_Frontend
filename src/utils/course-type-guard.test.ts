/*
 * 课程类型的两个视角（P4 冗余清理）。
 *
 * 曾有两个同名的 `ICourseType`：
 *
 * - `types/schedule-types.ts`：**前端规范模型**。字段必填，
 *   带 `id` 与 `weekPattern`。页面、周视图、编辑表单用它。
 * - `types/app-types.ts`：**服务端原始响应**。字段全可选，
 *   因为导入/识别接口返回的数据本来就可能缺字段（`position`、`day`、
 *   `startSection` 等都是历史别名）。
 *
 * 两者不是重复，而是同一条数据链路的两个阶段：
 *
 *     服务端原始 JSON  →  规范化  →  前端模型
 *     （全可选）                     （必填，有 id 与 weekPattern）
 *
 * 但**同名**会让后来者拿错：把原始响应类型用在周视图里，
 * TS 不会报错（字段可选永远兼容），到运行时才发现 `weekPattern` 是 undefined。
 *
 * 已改名为 `ICourseRawType`。这个测试钉住：
 * 1. `app-types` 不再导出会撞名的 `ICourseType`
 * 2. 原始类型保持「全可选」语义（它描述的是不可信的外部输入）
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const appTypes = readFileSync(
  resolve(process.cwd(), 'src/types/app-types.ts'),
  'utf8',
);

test('app-types 不再导出 ICourseType（避免与规范模型撞名）', () => {
  // `export interface ICourseType` 或 `export type ICourseType` 都不允许
  const collides = /export\s+(interface|type)\s+ICourseType\b/.test(appTypes);
  assert.equal(
    collides,
    false,
    'app-types.ts 又导出了 ICourseType。\n' +
      '  服务端原始响应用 ICourseRawType，前端规范模型用 schedule-types 的 ICourseType。\n' +
      '  同名会让「可选字段」的版本被误用在需要 weekPattern 的地方。',
  );
});

test('原始课程类型仍保持全可选语义', () => {
  const start = appTypes.indexOf('export interface ICourseRawType');
  assert.ok(start >= 0, '找不到 ICourseRawType');

  const body = appTypes.slice(start, appTypes.indexOf('\n}', start));

  // `name` 是唯一必填字段：没有课程名的记录没有意义，服务端也不会返回
  assert.ok(/name\s*:\s*string;/.test(body), 'ICourseRawType.name 应必填');

  // 其余字段描述的是不可信的外部输入，必须全可选。
  // 写成必填会让人以为「拿到的数据一定完整」，从而跳过规范化直接渲染。
  for (const optionalField of ['teacher', 'location', 'weeks', 'rawTime']) {
    assert.ok(
      new RegExp(`${optionalField}\\?:`).test(body),
      `ICourseRawType.${optionalField} 应可选`,
    );
  }

  // 原始类型不该有 id / weekPattern —— 那是规范化之后才有的
  assert.equal(
    /\bid\s*:/.test(body),
    false,
    'ICourseRawType 不该有 id：服务端原始响应里没有它',
  );
  assert.equal(
    /weekPattern/.test(body),
    false,
    'ICourseRawType 不该有 weekPattern：那是前端派生出来的',
  );
});

test('规范模型仍然有 id 与 weekPattern', () => {
  const scheduleTypes = readFileSync(
    resolve(process.cwd(), 'src/types/schedule-types.ts'),
    'utf8',
  );
  const start = scheduleTypes.indexOf('export interface ICourseType');
  assert.ok(start >= 0, '找不到规范 ICourseType');
  const body = scheduleTypes.slice(start, scheduleTypes.indexOf('\n}', start));

  assert.ok(/id\s*:\s*number/.test(body), '规范模型必须有 id');
  assert.ok(/weekPattern/.test(body), '规范模型必须有 weekPattern');
  // 与原始类型相反：这些在规范化之后一定存在
  assert.ok(/name\s*:\s*string;/.test(body), '规范模型的 name 应为必填');
});
