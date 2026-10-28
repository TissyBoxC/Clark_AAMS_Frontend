/* 验收暗色主题：点一下切换按钮，取切换前后的真实计算色值。 */
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
  await page.goto('https://card.clarkhub.cn/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));

  const read = () =>
    page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const card = document.querySelector('.feature-card, .surface-card');
      const cs = card ? getComputedStyle(card) : null;
      return {
        theme: document.documentElement.dataset.theme || '(未设置)',
        bg: root.getPropertyValue('--bg').trim(),
        surface: root.getPropertyValue('--surface').trim(),
        text: root.getPropertyValue('--text').trim(),
        primary: root.getPropertyValue('--primary').trim(),
        bodyBg: getComputedStyle(document.body).backgroundColor,
        cardBg: cs ? cs.backgroundColor : '(无卡片)',
        outline: root.getPropertyValue('--line').trim(),
      };
    });

  const btn = await page.$('.theme-toggle');
  console.log('切换按钮存在:', !!btn);

  const before = await read();
  console.log('\n初始:', JSON.stringify(before, null, 0));

  if (btn) {
    await btn.click();
    await new Promise((r) => setTimeout(r, 500));
    const after = await read();
    console.log('点击后:', JSON.stringify(after, null, 0));

    // 再点回去
    await btn.click();
    await new Promise((r) => setTimeout(r, 400));
    const back = await read();
    console.log('再点回:', JSON.stringify(back, null, 0));

    console.log('\n切换有效:', before.bg !== after.bg && back.bg === before.bg);
    console.log('刷新后保持:', await page.evaluate(() => localStorage.getItem('clark-aams-theme')));
  }

  await browser.close();
})();
