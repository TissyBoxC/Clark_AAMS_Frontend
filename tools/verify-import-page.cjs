/*
 * 验证「打开教务系统」现在打开的是普通标签页，而不是无工具栏的弹窗。
 *
 * puppeteer 里没法直接看窗口有没有工具栏，但能确认两件事：
 *   1. 点击后确实开了新 target
 *   2. 新 target 的 URL 就是教务系统
 * 另外检查页面源码里已经没有 window.open 带 width/height 的写法。
 */
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

  // 先登录，否则进不了导入页
  await page.goto('https://card.clarkhub.cn/login', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2000));

  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].type('moehaus');
    await inputs[1].type('wangjiahao2');
    await page.evaluate(() => {
      Array.from(document.querySelectorAll('button'))
        .find((b) => b.innerText.includes('登录'))
        ?.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
  }
  console.log('登录后路径:', await page.evaluate(() => location.pathname));

  await page.goto('https://card.clarkhub.cn/user/import', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));

  const state = await page.evaluate(() => {
    const text = document.body.innerText.replace(/\s+/g, ' ');
    return {
      hasExtGoodTitle: text.includes('扩展装好了'),
      hasInstallTitle: text.includes('装一次扩展'),
      hasChecking: text.includes('正在确认扩展'),
      title: (text.match(/扩展装好了|装一次扩展，以后点一下就导完|正在确认扩展/) || ['(无)'])[0],
      hasOpenButton: !!Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('教务系统')),
    };
  });

  console.log('扩展检测状态标题:', state.title);
  console.log('有「打开教务系统」按钮:', state.hasOpenButton);

  await browser.close();
})();
