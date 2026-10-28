/* 未登录访问导入页：确认重定向到登录，且导入页模块能正常加载不报错。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));

  await page.goto('https://card.clarkhub.cn/user/import', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  console.log('落点:', await page.evaluate(() => location.pathname));
  console.log('JS 错误:', errors.length ? errors[0] : '无');

  await browser.close();
})();
