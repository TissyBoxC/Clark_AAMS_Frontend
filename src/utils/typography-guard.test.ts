/*
 * 排版规范守卫。
 *
 * 背景：这次被指出「字号大、看着丑」，查下来发现 index.css 里有
 * **31 种字号**：11.2 / 11.5 / 12.2 / 12.5 / 12.8 / 13.1 / 13.4 /
 * 13.6 / 13.8 / 14.1 / 14.4 / 14.7 / 15.2 / 15.4 / 15.7 px…
 * 相邻两级只差 0.3–0.4px。差别看不出来，视觉上就是一片字糊在一起。
 *
 * 更糟的是根字号被误写成 17px，全站 rem 集体放大 6.25%，
 * 大标题从 64px 变成 68px。
 *
 * 现在统一成 6 级阶梯（token 定义在 :root 的 --text-*）。
 * 这个测试守住三件事：
 *   1. CSS 里不再出现新的裸字号，只能用 var(--text-*)
 *   2. 根字号必须是 16px
 *   3. 中文字距不能收紧过头（-0.02em 是上限），行高不能低于 1.12
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

function collectCss(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectCss(full));
    } else if (entry.name.endsWith('.css')) {
      found.push(full);
    }
  }
  return found;
}

const cssFiles = collectCss(resolve(process.cwd(), 'src'));

/** 去掉注释与 token 定义块（那里本来就该写具体值）。 */
function stripNoise(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:root\s*\{[^}]*\}/g, '')
    .replace(/html\[data-theme='(?:light|dark)'\]\s*\{[^}]*\}/g, '')
    // 根字号是 rem 的基准，必须写绝对值，由上一个用例单独校验
    .replace(/^html\s*\{[^}]*\}/m, '');
}

test('根字号是 16px，不能引用字阶 token', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
  const htmlBlock = css.match(/^html\s*\{[^}]*\}/m);
  assert.ok(htmlBlock, '未找到 html 规则');

  assert.match(
    htmlBlock[0],
    /font-size:\s*16px\s*;/,
    'html 的 font-size 必须是 16px。写成 var(--text-*) 会让全站 rem 一起放大/缩小。',
  );
});

test('CSS 里不再出现裸字号，只允许 var(--text-*)', () => {
  const offenders: string[] = [];

  for (const file of cssFiles) {
    const lines = stripNoise(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      const m = line.match(/font-size:\s*([^;]+);/);
      if (!m) return;
      const value = m[1].trim();
      // 允许：token、clamp()（首屏响应式标题）、inherit
      if (value.startsWith('var(--text-') || value.startsWith('clamp(') || value === 'inherit') {
        return;
      }
      offenders.push(`${file}:${index + 1} font-size: ${value}`);
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `发现裸字号，请改用 var(--text-xs|sm|base|lg|xl|2xl|display)：\n${offenders.join('\n')}`,
  );
});

test('中文字距不超过 -0.02em', () => {
  const offenders: string[] = [];

  for (const file of cssFiles) {
    const lines = stripNoise(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      const m = line.match(/letter-spacing:\s*(-?[0-9.]+)em/);
      if (!m) return;
      // 中文字身等宽，收紧超过 -0.02em 会粘连。正字距不限制。
      if (Number.parseFloat(m[1]) < -0.02) {
        offenders.push(`${file}:${index + 1} letter-spacing: ${m[1]}em`);
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `中文字距收得太紧，字会粘连：\n${offenders.join('\n')}`,
  );
});

test('行高不低于 1.12，避免裁掉汉字笔画', () => {
  const offenders: string[] = [];

  for (const file of cssFiles) {
    const lines = stripNoise(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      const m = line.match(/line-height:\s*([0-9.]+)\s*;/);
      if (!m) return;
      const ratio = Number.parseFloat(m[1]);
      // 只检查无单位倍数；0 表示继承，跳过
      if (ratio > 0 && ratio < 1.12) {
        offenders.push(`${file}:${index + 1} line-height: ${m[1]}`);
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `行高过小，汉字上下会贴边：\n${offenders.join('\n')}`,
  );
});
