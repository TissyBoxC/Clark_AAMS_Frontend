/* 查某个元素的字号到底来自哪条规则。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  const info = await page.evaluate(() => {
    const el = document.querySelector('.hero-title');
    if (!el) return { error: '未找到 .hero-title' };
    const cs = getComputedStyle(el);
    return {
      text: el.innerText.slice(0, 20),
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      fontWeight: cs.fontWeight,
      fontFamily: cs.fontFamily,
      htmlFontSize: getComputedStyle(document.documentElement).fontSize,
      vw: window.innerWidth,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // 检查字体是否真的加载成功
  const fonts = await page.evaluate(() =>
    Array.from(document.fonts).map((f) => `${f.family} ${f.weight} ${f.status}`),
  );
  console.log('已加载字体:', fonts.length ? fonts.join(', ') : '(无 web 字体，用系统字体)');

  await browser.close();
})();
