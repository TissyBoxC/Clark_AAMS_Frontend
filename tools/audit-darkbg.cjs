/* 检查深色主题下实际的页面底色（不是 token，是渲染结果）。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle2' });

  await page.click('.theme-toggle');
  await new Promise((r) => setTimeout(r, 600));

  const dark = await page.evaluate(() => {
    const el = document.elementFromPoint(700, 300);
    return {
      htmlBg: getComputedStyle(document.documentElement).backgroundColor,
      bodyBgImage: getComputedStyle(document.body).backgroundImage.slice(0, 220),
      elementUnderCursor: el ? `${el.tagName}.${el.className}`.slice(0, 60) : '',
      elementBg: el ? getComputedStyle(el).backgroundColor : '',
      bodyText: getComputedStyle(document.body).color,
    };
  });
  console.log('=== 深色 ===');
  console.log(JSON.stringify(dark, null, 2));

  await browser.close();
})();
