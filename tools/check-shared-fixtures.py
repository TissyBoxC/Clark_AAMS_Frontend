#!/usr/bin/env python3
"""校验三端共享契约 fixture 是否一致。

背景（P2-1）：
    `schedule-fixtures.json` 是 App 与 Web 共用的课表解析基准数据。
    但三个仓库各自独立，无法跨仓库 `import`，于是它被复制成了多份：

        shared/schedule-fixtures.json                   顶层，无消费者
        Clark_AAMS/shared/schedule-fixtures.json        App 测试读取
        Clark_AAMS_Frontend/shared/schedule-fixtures.json  Web 测试读取

    目前三份字节完全相同 —— 但那是靠人工同步维持的。
    只要有人改了其中一份而忘了另两份，App 和 Web 就会拿**不同的基准**
    各自跑绿，从而掩盖真实的契约漂移。这是比「测试失败」更危险的状态：
    两边都绿，线上却对不上。

    本脚本把「三份必须一致」变成一条可执行的检查，而不是一条口头约定。

用法：
    python tools/check-shared-fixtures.py          # 校验，不一致则退出码 1
    python tools/check-shared-fixtures.py --fix    # 以顶层 shared/ 为准，同步到另外两份
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
from pathlib import Path

# Windows 控制台默认 GBK，输出中文/符号会抛 UnicodeEncodeError。
# 统一改成 UTF-8 并替换无法编码的字符，保证脚本在任何终端都能跑完。
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# 相对于本脚本所在目录的上一级（即 clark_aams 工作区根目录）
ROOT = Path(__file__).resolve().parent.parent

# 顺序有意义：第一个是权威副本，--fix 时以它为准
COPIES = [
    ROOT / "shared" / "schedule-fixtures.json",
    ROOT / "Clark_AAMS" / "shared" / "schedule-fixtures.json",
    ROOT / "Clark_AAMS_Frontend" / "shared" / "schedule-fixtures.json",
]

DISPLAY = [
    "shared/",
    "Clark_AAMS/shared/",
    "Clark_AAMS_Frontend/shared/",
]


CRLF_BYTES = bytes([13, 10])
LF_BYTES = bytes([10])


def digest(path: Path) -> str:
    """归一换行符后求摘要。

    仓库里存的是 LF，但 Windows 的 core.autocrlf 会把工作区改成 CRLF。
    直接对原始字节求摘要，同一个文件在不同环境下会得出两个值——
    那样比的就不是「内容是否一致」，而是「在哪个平台算的」。
    """
    raw = path.read_bytes().replace(CRLF_BYTES, LF_BYTES)
    return hashlib.sha256(raw).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="校验三端共享 fixture 一致性")
    parser.add_argument(
        "--fix",
        action="store_true",
        help="不一致时以顶层 shared/ 为准，覆盖其余副本",
    )
    args = parser.parse_args()

    missing = [str(p) for p in COPIES if not p.exists()]
    if missing:
        print("缺少 fixture 文件：", file=sys.stderr)
        for item in missing:
            print(f"  - {item}", file=sys.stderr)
        return 1

    digests = [digest(p) for p in COPIES]
    if len(set(digests)) == 1:
        print(f"[OK] 三份 fixture 一致（sha256 {digests[0][:16]}...）")
        return 0

    if args.fix:
        source = COPIES[0]
        for target in COPIES[1:]:
            shutil.copyfile(source, target)
            print(f"   已同步 -> {target.relative_to(ROOT)}")
        print("[OK] 已以顶层 shared/ 为准同步完毕")
        return 0

    print("[FAIL] 三份 fixture 不一致——App 与 Web 正在用不同的基准数据：", file=sys.stderr)
    for label, d in zip(DISPLAY, digests):
        print(f"  {label:<34} {d[:16]}...", file=sys.stderr)
    print(
        "\n修复：确认顶层 shared/ 是想要的版本后运行\n"
        "    python tools/check-shared-fixtures.py --fix\n",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
