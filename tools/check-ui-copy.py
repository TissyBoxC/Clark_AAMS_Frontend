#!/usr/bin/env python3
"""
界面文案自检：找出会显示给用户、但违反文案规范的内容。

只查**字符串字面量**，不查代码里的 `null`、`undefined` 这类数据默认值——
那些不会出现在界面上，全算进来只会制造噪音，让人忽略真正的问题。

检查的四类问题：
1. 技术术语（API、session、token、404 等）
2. 开发提示（检查控制台、配置、开发中 等）
3. 泛化营销语（欢迎使用、极致体验、一站式 等）
4. 只写「暂无数据」这类没有下一步的空状态

用法：
    python tools/check-ui-copy.py            # 检查 Web 与 App
    python tools/check-ui-copy.py --web      # 只查 Web
"""
import argparse
import os
import re
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 技术术语：用户不该看到实现细节
TECHNICAL = [
    r'\bAPI\b', r'\binterface\b', r'\brequest\b', r'\bresponse\b', r'\bstatus\s*code\b',
    r'\btoken\b', r'\bcookie\b', r'\bsession\b', r'\broute\b', r'\bcomponent\b',
    r'\bprops\b', r'\bstate\b', r'\bdatabase\b', r'\bSQL\b', r'\bcache\b', r'\bCORS\b',
    r'\b404\b', r'\b500\b', r'\b401\b', r'\b403\b', r'\bundefined\b', r'\bnull\b',
    r'\bNaN\b', r'\[object Object\]', r'localhost', r'127\.0\.0\.1', r'\bport\b',
    r'环境变量', r'\bmock\b', r'Swagger', r'console\b', r'\blog\b', r'stack trace',
    r'接口', r'会话', r'堆栈', r'后端', r'前端', r'数据库', r'配置项', r'API ?Key',
    r'后台管理', r'后台入口', r'后台登录',
    # 文件格式与缩写：App 里曾写着「使用OCR导入」「粘贴课程 JSON 数组」，
    # 管理端写着「保存 JSON」，用户都看不懂。
    r'\bOCR\b', r'\bJSON\b', r'\bHTML\b', r'\bXML\b', r'\bSDK\b', r'\bBuild\b',
    r'适配器', r'脚手架', r'代码骨架', r'/api/', r'/chat/',
    # 这几个词只在配置说明里出现过，且都出现在用户要读的句子里
    r'Provider', r'endpoint', r'SMTP',
    # 别把 /v1 单独列成违规：管理员填服务地址时它必须出现，那是正当内容。
]

# 原始错误渲染：把异常对象/状态码直接拼进用户能看到的文案。
# App 里曾有 8 处写着「导入失败：$error」，用户会看到
# 「导入失败：SocketException: Failed host lookup」。
RAW_ERROR = [
    r'：\$error', r': \$error', r'：\$e', r'\$\{error\}', r'\$\{e\}',
    r'\$statusCode', r'\$\{statusCode\}', r'\$response', r'\$payload',
]

# 开发提示：写给开发者看的话
DEVELOPER = [
    r'检查控制台', r'检查网络', r'查看日志', r'开发中', r'即将上线', r'TODO', r'FIXME',
    r'示例文本', r'Lorem ipsum', r'测试数据', r'用户1', r'项目A', r'参考文档', r'传参',
    r'请配置', r'未配置',
]

# 泛化营销语
MARKETING = [
    r'欢迎使用', r'让我们一起', r'解锁', r'赋能', r'一站式', r'极致体验', r'开启美好',
]

# 无下一步的空状态
EMPTY_ONLY = [r'^\s*暂无数据\s*$', r'^\s*没有数据\s*$', r'^\s*加载中\.\.\.?\s*$']

PATTERNS = (
    [(re.compile(p, re.I), '技术术语') for p in TECHNICAL]
    + [(re.compile(p, re.I), '开发提示') for p in DEVELOPER]
    + [(re.compile(p, re.I), '营销语') for p in MARKETING]
    + [(re.compile(p), '空状态') for p in EMPTY_ONLY]
    + [(re.compile(p), '原始错误') for p in RAW_ERROR]
)

# 中文字符串字面量；单引号、双引号、反引号都算
# 注意 {2,} 是贪婪的，会把结尾的引号也吃进捕获组，导致 '暂无数据' 被读成
# "暂无数据'" —— 于是 ^...$ 这类整串匹配全部失效。必须用非贪婪 + 明确的收尾引号。
STRING_RE = re.compile(r"""(?<![\w.])(['"`])((?:\\.|(?!\1)[^\\\n]){2,}?)\1""")

# JSX 里直接写在标签之间的文案没有引号（<td>暂无数据</td>）。
# 只扫字符串字面量会整片漏掉——「暂无数据」正是这么漏过去的。
JSX_TEXT_RE = re.compile(r'>([^<>{}]{2,})<')

# 整行跳过：纯注释、导入、样式类名拼接
SKIP_LINE = re.compile(r'^\s*(//|\*|/\*|import\s|from\s|class(Name)?=|style=|data-)')

# 面向开发者的页面，技术词是正当内容，不是泄漏。
# 只放真正写给开发看的页面，别把普通用户页面塞进来。
DEV_FACING_FILES = ('api-page.tsx',)

# 出现这些说明是代码而不是文案
CODE_HINT = re.compile(r'(\bfunction\b|\breturn\b|\.test\(|\.match\(|regex|RegExp|^\s*[\w-]+\s*:\s*[\w-]+\s*$)')


def scan_file(path: str):
    findings = []
    try:
        with open(path, encoding='utf-8') as handle:
            lines = handle.readlines()
    except (OSError, UnicodeDecodeError):
        return findings

    # 开发文档页只查营销语和空状态，技术术语对它来说是正当内容
    is_dev_facing = os.path.basename(path) in DEV_FACING_FILES

    for number, line in enumerate(lines, 1):
        if SKIP_LINE.search(line) or CODE_HINT.search(line):
            continue
        for match in STRING_RE.finditer(line):
            text = match.group(2)
            # 纯 ASCII 且不像句子（类名、键名、路径）就跳过
            if not re.search(r'[\u4e00-\u9fff]', text):
                continue
            for pattern, label in PATTERNS:
                if is_dev_facing and label == '技术术语':
                    continue
                if pattern.search(text):
                    findings.append((path, number, label, text[:70]))
                    break
        # JSX 文本节点单独再扫一遍，覆盖没有引号的那部分
        for match in JSX_TEXT_RE.finditer(line):
            text = match.group(1).strip()
            if not re.search(r'[一-鿿]', text):
                continue
            for pattern, label in PATTERNS:
                if is_dev_facing and label == '技术术语':
                    continue
                if pattern.search(text):
                    findings.append((path, number, label, text[:70]))
                    break
    return findings


def collect(directory: str, extensions: tuple) -> list:
    results = []
    for base, _, names in os.walk(directory):
        for name in names:
            if not name.endswith(extensions):
                continue
            # 测试文件里必然写着违规样本（否则没法验证检查器），不参与扫描
            if name.endswith(('.test.ts', '.test.tsx', '_test.dart')):
                continue
            results.extend(scan_file(os.path.join(base, name)))
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description='检查界面文案')
    parser.add_argument('--web', action='store_true')
    parser.add_argument('--app', action='store_true')
    args = parser.parse_args()

    check_web = args.web or not (args.web or args.app)
    check_app = args.app or not (args.web or args.app)

    findings = []
    if check_web:
        findings += collect(os.path.join(ROOT, 'Clark_AAMS_Frontend', 'src'), ('.tsx', '.ts'))
        # index.html 的 title 与 description 会出现在搜索结果和分享卡片里，
        # 也是用户可见内容。之前漏了这里，导致上线后标题还留着英文旧名。
        findings += scan_file(os.path.join(ROOT, 'Clark_AAMS_Frontend', 'index.html'))
    if check_app:
        findings += collect(os.path.join(ROOT, 'Clark_AAMS', 'lib'), ('.dart',))

    if not findings:
        print('未发现违规文案。')
        return 0

    current = None
    for path, number, label, text in findings:
        rel = os.path.relpath(path, ROOT)
        if rel != current:
            print(f'\n{rel}')
            current = rel
        print(f'  {number:>4}  [{label}] {text}')
    print(f'\n共 {len(findings)} 处需要修改。')
    return 1


if __name__ == '__main__':
    sys.exit(main())
