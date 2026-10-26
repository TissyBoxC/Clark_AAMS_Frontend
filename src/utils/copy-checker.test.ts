/**
 * 守护文案检查器本身。
 *
 * 背景：这个检查器曾经有两处 bug，导致它一直报「未发现违规」，
 * 而我把它当作验收依据：
 *   1. JSX 里直接写在标签之间的文案没有引号，从来没被扫过；
 *   2. CODE_HINT 里的 `\bconst\b` 会让 `const x = '...'` 整行被跳过。
 * 直到手动发现「暂无数据」没被抓到，才知道它是坏的。
 *
 * 所以这一组测试不是为了检查文案，而是为了**证明检查器本身有效**：
 * 拿明确的违规样本喂给它，必须能报出来。检查器失效时这里会先红。
 * （已验证：关掉 JSX 扫描后，两条 JSX 用例立即变红。）
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

const CHECKER = 'tools/check-ui-copy.py';

/** 建一个临时「工作区」，让检查器扫它。 */
function makeProbe(sample: string): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'copy-probe-'));
  // 检查器会向上找同时含这两个目录的位置，按同样的形状搭一个
  const webDir = join(root, 'Clark_AAMS_Frontend', 'src');
  const appDir = join(root, 'Clark_AAMS', 'lib');
  execFileSync('mkdir', ['-p', webDir, appDir]);
  writeFileSync(join(webDir, 'probe.tsx'), sample, 'utf8');
  writeFileSync(join(appDir, 'probe.dart'), sample, 'utf8');
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function runChecker(target: '--web' | '--app', sample: string): { code: number; output: string } {
  const { root, cleanup } = makeProbe(sample);
  try {
    // 把检查器放进探针根目录的 tools/ 下，让它按真实结构找路径
    execFileSync('mkdir', ['-p', join(root, 'tools')]);
    execFileSync('cp', [CHECKER, join(root, 'tools', 'check-ui-copy.py')]);
    try {
      const output = execFileSync('python', [join(root, 'tools', 'check-ui-copy.py'), target], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, output };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return { code: failure.status ?? 1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
    }
  } finally {
    cleanup();
  }
}

describe('文案检查器必须真的能发现问题', () => {
  after(() => {
    // 无需清理，每个用例自己清
  });

  it('能抓到 JSX 里没有引号的「暂无数据」', () => {
    const { code, output } = runChecker('--web', '      <td colSpan={5}>暂无数据</td>\n');
    assert.equal(code, 1, '检查器应当以非零码退出');
    assert.match(output, /暂无数据/);
  });

  it("能抓到 Dart 里的 Text('暂无数据')", () => {
    const { code, output } = runChecker('--app', "    child: Text('暂无数据'),\n");
    assert.equal(code, 1);
    assert.match(output, /暂无数据/);
  });

  it('能抓到 JSX 里的英文技术词 JSON', () => {
    const { code, output } = runChecker('--web', '  <p>识别后生成课程 JSON。</p>\n');
    assert.equal(code, 1);
    assert.match(output, /技术术语/);
  });

  it('能抓到「后端」这类中文技术词', () => {
    const { code, output } = runChecker('--app', "    child: Text('学校列表由后端实时提供'),\n");
    assert.equal(code, 1);
    assert.match(output, /技术术语/);
  });

  it('正常的用户文案不应被误报', () => {
    const { code, output } = runChecker('--web', '  <p>还没有课表，先去导入你的课程。</p>\n');
    assert.equal(code, 0, `不应报错，实际输出：${output}`);
  });

  it('管理员填服务地址用的 /v1 不算技术词泄漏', () => {
    const { code, output } = runChecker('--web', '  <p>服务地址填到 /v1 就够了。</p>\n');
    assert.equal(code, 0, `/v1 是正当内容，不该报错，实际输出：${output}`);
  });
});
