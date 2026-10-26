#!/usr/bin/env python3
"""
对比度审计：找出界面上可能看不清的文字。

只做静态推断——把 CSS 里出现的文字色 × 背景色两两组合算一遍，
标出低于 WCAG AA（正文 4.5:1）的组合。

它不是万能的：渐变、半透明叠加、动态换肤都会让静态推断偏离实际。
所以它给出的是**需要人工确认的候选**，不是判决书。真正的验证还是要
在浏览器里看。但「浅粉字压在粉底上」这种致命组合，它能稳定抓到。
"""
import itertools
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_DIRS = [
    os.path.join(ROOT, 'Clark_AAMS_Frontend', 'src'),
]

# 已知的表面色（背景）
SURFACES = {
    '#fff9fa': '粉白底',
    '#ffffff': '纯白',
    '#fff2f5': '极浅粉',
    '#fff7f9': '浅粉面',
    '#ffe9ef': '浅粉',
    '#fff0f4': '浅粉二',
}

# 已知的文字色
TEXT_COLORS = {
    '#4a2e3b': '深梅灰',
    '#6b4f5a': '深梅灰浅',
    '#c93c7d': '糖果粉',
    '#b23a68': '深粉',
    '#ab2f69': '深粉二',
    '#b3304a': '警示红',
    '#2f7d5b': '成功绿',
    '#9a5b16': '警告褐',
}


def luminance(hex_color):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    def channel(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    high, low = max(la, lb), min(la, lb)
    return (high + 0.05) / (low + 0.05)


def main():
    print('文字色 × 背景色 组合审计（正文要求 >= 4.5:1）\n')
    failures = []
    for (fg, fg_name), (bg, bg_name) in itertools.product(TEXT_COLORS.items(), SURFACES.items()):
        ratio = contrast(fg, bg)
        mark = 'OK ' if ratio >= 4.5 else '低 '
        if ratio < 4.5:
            failures.append((fg_name, bg_name, ratio))
        print(f'  {mark} {fg_name:8} on {bg_name:6} = {ratio:5.2f}')

    # 扫源文件里「浅色当文字」的可疑写法
    print('\n源码中把浅色用作文字色的位置（很可能是笔误）：')
    suspicious = []
    pattern = re.compile(r'color:\s*(?:var\((--[\w-]+soft)\)|(#[fF][0-9a-fA-F]{5}))')
    for base_dir in CSS_DIRS:
        for base, _, names in os.walk(base_dir):
            for name in names:
                if not name.endswith(('.css',)):
                    continue
                path = os.path.join(base, name)
                with open(path, encoding='utf-8') as handle:
                    for number, line in enumerate(handle, 1):
                        found = pattern.search(line)
                        if found:
                            token = found.group(1) or found.group(2)
                            # 浅粉、近白这类值当文字色，通常意味着对比度不足
                            if token and ('soft' in token or token.lower().startswith('#ff')):
                                suspicious.append(
                                    (os.path.relpath(path, ROOT), number, token, line.strip()[:60])
                                )
    if suspicious:
        for rel, number, token, snippet in suspicious:
            print(f'  {rel}:{number}  {token}   {snippet}')
    else:
        print('  未发现。')

    print(f'\n低于 4.5:1 的组合：{len(failures)} 个')
    for fg_name, bg_name, ratio in failures:
        print(f'  {fg_name} on {bg_name} = {ratio:.2f}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
