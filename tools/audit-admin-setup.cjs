/* 等待注册页真正渲染完成再判定，避免取样过早。 */
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

  await page.goto('https://card.clarkhub.cn/admin/register', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });

  // 轮询等待输入框出现，最多 15 秒
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const n = await page.evaluate(() => document.querySelectorAll('input').length);
    if (n >= 3) {
      ready = true;
      break;
    }
  }

  const state = await page.evaluate(() => ({
    path: location.pathname,
    inputs: document.querySelectorAll('input').length,
    buttons: Array.from(document.querySelectorAll('button'))
      .map((b) => b.innerText.trim())
      .filter(Boolean),
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120),
  }));

  console.log('注册表单已渲染:', ready);
  console.log('路径:', state.path);
  console.log('输入框数:', state.inputs);
  console.log('按钮:', JSON.stringify(state.buttons));
  console.log('文字:', state.text);

  await browser.close();
})();
