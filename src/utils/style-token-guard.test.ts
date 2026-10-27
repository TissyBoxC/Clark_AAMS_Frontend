/*
 * 样式 token 一致性检查（P4-3）。
 *
 * 背景：`index.css` 有一套完整的 token 体系（间距、圆角、配色、阴影），
 * 也定义了暗色主题（`@media (prefers-color-scheme: dark)`）。
 *
 * 但统计下来：`var(--...)` 用了 200 处，硬编码颜色却有 346 处。
 * token 存在，但一半以上的颜色绕过了它。
 *
 * 后果不是「代码不好看」，而是具体的视觉缺陷：
 * 硬编码的 `rgba(255, 255, 255, 0.72)` 在暗色模式下依然是一块**白底**，
 * 而对应的 `--surface` 在暗色下会变成 `rgba(30, 36, 47, 0.82)`。
 * 于是暗色模式下这些卡片、遮罩、分隔线会显得刺眼。
 *
 * 这个测试不做「全部改完」的要求——那是一次涉及十余个页面的大改。
 * 它只做一件事：**给这类硬编码设一个上限，并阻止它继续增加**。
 * 数量回退（有人修了）不报警，数量上涨就红。
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const cssPath = resolve(process.cwd(), 'src/styles/index.css');
const css = readFileSync(cssPath, 'utf8');

/**
 * 收集 `src` 下所有 CSS 文件。
 *
 * 之前所有守卫只看 `src/styles/index.css`，而实际上还有 4 个文件
 * （`App.css`、两个 `.module.css`）从未被扫过——紫蓝色就是那么留下的。
 */
function collectCssFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectCssFiles(full));
    } else if (entry.name.endsWith('.css')) {
      found.push(full);
    }
  }
  return found;
}

/**
 * 主题定义块：`:root` 与暗色 `:root` 里**应当**出现具体颜色值，
 * 那里就是 token 的唯一定义处。统计时要排除。
 */
function stripTokenDefinitions(source: string): string {
  // 去掉所有 :root { ... } 块（含暗色主题里的那份）
  return source.replace(/:root\s*\{[^}]*\}/g, '');
}

/** 去掉注释，避免示例代码被计入。 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

const body = stripTokenDefinitions(stripComments(css));

function count(pattern: RegExp): number {
  return (body.match(pattern) ?? []).length;
}

/**
 * 硬编码颜色的上限。
 *
 * 当前实测值：hex 80 处、rgb/rgba 233 处（已排除 `:root` 里的 token 定义）。
 *
 * 244 → 233 是本轮把 11 处 rgba(255,255,255,0.72) 收敛成 --surface-glass 的结果；
 * 那 11 处在暗色模式下原本都是盖在深色背景上的白斑。
 * 上限就钉在实测值——不留「正常微调」的余量，因为任何新增的硬编码颜色
 * 都是一个新的暗色模式隐患。要加颜色，先加 token。
 *
 * 降低这个数字的正确做法：把成组的白色叠加
 * （`rgba(255,255,255,0.52/0.56/0.72/0.78/0.92)`）换成一个
 * 带 alpha 参数的 token，一次能消掉几十处。
 *
 * **不要**为了过测试去改数字——那等于承认「绕过 token 是允许的」。
 */
const MAX_HARDCODED_HEX = 80;
const MAX_HARDCODED_RGB = 233;

test('硬编码 hex 颜色不超过上限', () => {
  const actual = count(/#[0-9a-fA-F]{3,8}\b/g);
  assert.ok(
    actual <= MAX_HARDCODED_HEX,
    `index.css 的硬编码 hex 颜色增加到 ${actual} 处（上限 ${MAX_HARDCODED_HEX}）。\n` +
      `  新写的颜色请用 var(--...) token；\n` +
      `  这些值在暗色模式下不会跟随主题变化。`,
  );
});

test('硬编码 rgb/rgba 颜色不超过上限', () => {
  const actual = count(/rgba?\s*\(/g);
  assert.ok(
    actual <= MAX_HARDCODED_RGB,
    `index.css 的硬编码 rgb/rgba 颜色增加到 ${actual} 处（上限 ${MAX_HARDCODED_RGB}）。\n` +
      `  尤其是 rgba(255,255,255,α) 这类——暗色模式下会变成刺眼白块。`,
  );
});

test('token 体系仍在（防止被误删）', () => {
  // 这些是主题的骨架，删掉任何一个都会让暗色模式或整体视觉塌掉
  for (const token of [
    '--surface',
    '--surface-soft',
    '--surface-strong',
    '--line',
    '--text',
    '--muted',
    '--primary',
    '--radius-md',
    '--space-4',
  ]) {
    assert.ok(
      css.includes(token + ':') || css.includes(token + ' '),
      `token ${token} 不见了`,
    );
  }
});

test('暗色主题仍然定义了 surface 系列', () => {
  const start = css.indexOf('@media (prefers-color-scheme: dark)');
  assert.ok(start >= 0, '找不到暗色主题块');

  // 从 @media 处按花括号配对取出整块
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') {
      depth += 1;
    } else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.ok(end > open, '暗色主题块未正确闭合');
  const darkBlock = css.slice(start, end + 1);

  for (const token of ['--surface', '--surface-soft', '--surface-strong', '--line']) {
    assert.ok(
      darkBlock.includes(token),
      `暗色主题缺少 ${token}——该项在暗色下会退回浅色值`,
    );
  }
});

/*
 * 紫蓝色扫描。
 *
 * 背景：粉白改色时只换了 `:root` 里的 token，**组件里的硬编码紫色没跟上**。
 * 登录页的选中标签、用户工作台的导航链接、账号菜单按钮，一共 11 处
 * 仍是 `#664be0` 这一系紫色。人工翻 4000 行 CSS 找不全。
 *
 * 判定：蓝色分量比红、绿都高出 24 以上 —— 那是紫蓝的特征。
 * 两个例外：
 * - `#66ccff` 是规范允许的点缀蓝；
 * - 课程色带的兜底色 `#2563eb` 属于功能色（用来区分不同课程），
 *   App 端同样保留。
 */
test('样式里不出现紫蓝色', () => {
  const allowed = new Set(['66ccff', '2563eb']);
  const offenders: string[] = [];

  for (const file of collectCssFiles(resolve(process.cwd(), 'src'))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      for (const match of line.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
        const hex = match[1].toLowerCase();
        if (allowed.has(hex)) continue;
        const [r, g, b] = [0, 2, 4].map((offset) =>
          Number.parseInt(hex.slice(offset, offset + 2), 16),
        );
        if (b > r + 24 && b > g + 24) {
          offenders.push(`${file}:${index + 1} #${hex}`);
        }
      }
    });
  }

  assert.deepEqual(offenders, [], `发现紫蓝色，粉白规范不允许：\n${offenders.join('\n')}`);
});
