/* 复现管理员登录：浏览器真实走一遍，抓每个请求的状态码。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const USER = process.argv[2] || 'moehaus';
const PASS = process.argv[3] || 'wangjiahao2';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const apiCalls = [];
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/api/')) {
      apiCalls.push(`${res.status()} ${url.replace('https://card.clarkhub.cn', '')}`);
    }
  });

  await page.goto('https://card.clarkhub.cn/admin/login', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });
  await new Promise((r) => setTimeout(r, 2500));

  const inputs = await page.$$('input');
  console.log('输入框数:', inputs.length);
  if (inputs.length >= 2) {
    await inputs[0].type(USER);
    await inputs[1].type(PASS);
  }

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText.includes('登录') || b.innerText.includes('进入'),
    );
    btn?.click();
  });

  await new Promise((r) => setTimeout(r, 5000));

  const state = await page.evaluate(() => ({
    path: location.pathname,
    text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200),
    hasCookie: document.cookie,
  }));

  console.log('\n登录后路径:', state.path);
  console.log('页面文字:', state.text);
  console.log('\n接口调用:');
  for (const c of apiCalls) console.log('  ' + c);

  await browser.close();
})();
