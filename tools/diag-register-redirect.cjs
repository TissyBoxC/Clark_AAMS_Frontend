/* 诊断：注册成功后为什么停在 /admin/register 而不是跳到 dashboard。 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const USER = process.argv[2] || 'DiagUser';
const PASS = process.argv[3] || 'wangjiahao2';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  const nav = [];
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) nav.push(f.url().replace('https://card.clarkhub.cn', ''));
  });

  await page.goto('https://card.clarkhub.cn/admin/register', {
    waitUntil: 'networkidle2',
    timeout: 45000,
  });
  await new Promise((r) => setTimeout(r, 2000));

  const inputs = await page.$$('input');
  await inputs[0].type(USER);
  await inputs[1].type(PASS);
  await inputs[2].type(PASS);

  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.innerText.includes('创建管理员账号'))
      ?.click();
  });

  for (const wait of [1000, 2000, 4000, 6000]) {
    await new Promise((r) => setTimeout(r, wait));
    const s = await page.evaluate(async () => {
      const r = await fetch('/api/v1/auth/me', { credentials: 'include' });
      const j = await r.json().catch(() => ({}));
      return {
        path: location.pathname,
        meStatus: r.status,
        role: j?.data?.role,
        bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 90),
      };
    });
    console.log(`+${wait}ms path=${s.path} me=${s.meStatus} role=${s.role}`);
    console.log(`        文字: ${s.bodyText}`);
  }

  console.log('\n导航轨迹:', nav.join(' -> '));
  await browser.close();
})();
