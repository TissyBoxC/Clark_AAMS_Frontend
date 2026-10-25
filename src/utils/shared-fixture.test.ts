/*
 * 共享契约 fixture 的完整性检查（P2-1）。
 *
 * `shared/schedule-fixtures.json` 是 App 与 Web 共用的课表解析基准。
 * 两个仓库无法跨仓库 import，所以它被复制成了多份：
 *
 *     shared/schedule-fixtures.json                       顶层（权威）
 *     Clark_AAMS/shared/schedule-fixtures.json            App 读取
 *     Clark_AAMS_Frontend/shared/schedule-fixtures.json   Web 读取
 *
 * 危险之处不在于「某一份改了」——而在于**只改了其中一份**：
 * App 与 Web 会各自拿着一份不同的基准跑绿，线上却对不上。
 * 两边都绿比一边红更难排查。
 *
 * 跨仓库比对只能在本地做（CI 只 checkout 单个仓库），
 * 所以这里钉住本仓库副本的摘要：它一旦变化，这个用例就红，
 * 提醒你去同步另外两份，并跑一遍：
 *
 *     python tools/check-shared-fixtures.py
 *
 * 更新基准的正确姿势：先确认顶层 shared/ 是对的，再
 *     python tools/check-shared-fixtures.py --fix
 * 然后把下面 EXPECTED_SHA256 改成新值（App 侧同步改）。
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

/** 三份副本一致时的 sha256 前缀（与 App 侧保持一致）。 */
const EXPECTED_SHA256 = 'eb3760d1decafd71';

const fixturePath = resolve(process.cwd(), 'shared/schedule-fixtures.json');

const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
const LF = String.fromCharCode(10);

/**
 * 归一换行符后再求摘要。
 *
 * 这个文件在 git 里存的是 LF，但 Windows 的 `core.autocrlf` 会让工作区变成 CRLF。
 * 若直接对原始字节求摘要，同一份内容在本地与 CI 会得出两个不同的值——
 * 那样测的就不是「文件内容有没有变」，而是「在哪台机器上跑的」。
 *
 * 这正是这套检查第一次上线时「本地绿、CI 红」的原因。
 */
function normalizedBuf(buffer: Buffer): Buffer {
  const text = buffer.toString('utf8').split(CRLF).join(LF);
  return Buffer.from(text, 'utf8');
}

test('契约 fixture 未被单方面修改', () => {
  const content = readFileSync(fixturePath);
  const digest = createHash('sha256').update(normalizedBuf(content)).digest('hex');

  assert.equal(
    digest.slice(0, EXPECTED_SHA256.length),
    EXPECTED_SHA256,
    `shared/schedule-fixtures.json 已改变。\n` +
      `  App 与 Web 共用这份基准，只改一份会让两边各跑各的。\n` +
      `  请确认顶层 shared/ 是想要的版本后运行：\n` +
      `      python tools/check-shared-fixtures.py --fix\n` +
      `  再把本文件与 App 侧对应的 EXPECTED_SHA256 一起更新为新值。\n` +
      `  当前值：${digest.slice(0, 16)}`,
  );
});

test('契约 fixture 是可解析的 JSON 且含必要分组', () => {
  const data = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, unknown>;
  assert.equal(typeof data, 'object');
  // 至少要有实际内容，否则「一致」没有意义
  assert.ok(Object.keys(data).length > 0, 'fixture 不应为空');
});
