/* 验证：输错密码时用户看到的是什么话。 */
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

  // 情况一：密码错
  await page.goto('https://card.clarkhub.cn/admin/login', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  let inputs = await page.$$('input');
  await inputs[0].type('moehaus');
  await inputs[1].type('totallywrong');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.innerText.includes('登录') || b.innerText.includes('进入'))
      ?.click();
  });
  await new Promise((r) => setTimeout(r, 4000));
  const wrong = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  console.log('【密码错误】页面路径:', await page.evaluate(() => location.pathname));
  console.log('【密码错误】提示文字:', (wrong.match(/[^。]*不正确[^。]*。|[^。]*已失效[^。]*。/g) || ['(未找到)']).join(' | '));

  // 情况二：正确密码，确认能进
  await page.goto('https://card.clarkhub.cn/admin/login', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  inputs = await page.$$('input');
  await inputs[0].type('moehaus');
  await inputs[1].type('wangjiahao2');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.innerText.includes('登录') || b.innerText.includes('进入'))
      ?.click();
  });
  await new Promise((r) => setTimeout(r, 5000));
  console.log('\n【密码正确】页面路径:', await page.evaluate(() => location.pathname));

  await browser.close();
})();
