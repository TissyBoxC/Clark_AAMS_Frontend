/*
 * 提取页面真实渲染后的排版数据。
 *
 * 我这个模型无法直接看图片，所以改用「读计算样式」的方式验收视觉：
 * 把每个可见元素的实际字号、行高、字重、颜色都取出来，
 * 再检查是否落在设计规范内。这比看截图更可核对。
 */
const puppeteer = require('puppeteer-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function audit(url) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 1200));

  const data = await page.evaluate(() => {
    const out = [];
    const walk = (el) => {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const text = (el.innerText || '').trim();
      // 只看直接承载文字的元素
      const hasOwnText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
      );
      if (hasOwnText && text) {
        const rect = el.getBoundingClientRect();
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().split(' ').filter(Boolean)[0] || '',
          text: text.slice(0, 28),
          fontSize: Math.round(parseFloat(style.fontSize) * 10) / 10,
          lineHeight: Math.round(parseFloat(style.lineHeight) * 10) / 10,
          fontWeight: style.fontWeight,
          color: style.color,
          letterSpacing: style.letterSpacing,
          width: Math.round(rect.width),
          top: Math.round(rect.top),
        });
      }
      for (const child of el.children) walk(child);
    };
    walk(document.body);
    return {
      elements: out,
      pageHeight: document.body.scrollHeight,
      bg: getComputedStyle(document.body).backgroundColor,
      theme: document.documentElement.dataset.theme || '(跟随系统)',
    };
  });

  await browser.close();
  return data;
}

(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:4173/';
  const data = await audit(url);

  console.log(`主题: ${data.theme} | 页面背景: ${data.bg} | 总高: ${data.pageHeight}px`);
  console.log(`可见文字元素: ${data.elements.length}\n`);

  // 字号分布
  const sizes = {};
  for (const e of data.elements) sizes[e.fontSize] = (sizes[e.fontSize] || 0) + 1;
  console.log('实际字号分布:');
  for (const [size, count] of Object.entries(sizes).sort((a, b) => b[0] - a[0])) {
    console.log(`  ${size}px × ${count}`);
  }

  // 首屏最大的几块文字
  console.log('\n首屏主要文字（按字号降序，取前 10）:');
  const top = [...data.elements]
    .sort((a, b) => b.fontSize - a.fontSize)
    .slice(0, 10);
  for (const e of top) {
    console.log(
      `  ${String(e.fontSize).padStart(5)}px w${e.fontWeight.padStart(3)} lh${String(e.lineHeight).padStart(5)} ${e.color.padEnd(20)} <${e.tag}.${e.cls}> ${e.text}`,
    );
  }

  // 规范检查
  console.log('\n规范检查:');
  const tooBig = data.elements.filter((e) => e.fontSize > 64);
  const tooTight = data.elements.filter(
    (e) => e.lineHeight > 0 && e.fontSize > 0 && e.lineHeight / e.fontSize < 1.1,
  );
  const sizesUsed = new Set(data.elements.map((e) => e.fontSize));
  console.log(`  字号超过 64px: ${tooBig.length} 处 ${tooBig.map((e) => e.fontSize + 'px').join(', ')}`);
  console.log(`  行高比 < 1.1: ${tooTight.length} 处`);
  console.log(`  使用的不同字号数: ${sizesUsed.size}（理想 ≤ 8）`);
  console.log(`  过小的字号 (<12px): ${data.elements.filter((e) => e.fontSize < 12).length} 处`);
})();
