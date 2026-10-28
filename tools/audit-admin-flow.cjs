/*
 * 闭环验证：从「未初始化」开始，创建一个管理员，
 * 确认它既能进管理台、也能用用户工作台。
 */
const puppeteer = require('puppeteer-core');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const USER = process.argv[2] || 'Provias';
const PASS = process.argv[3] || 'wangjiahao2';

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
  await new Promise((r) => setTimeout(r, 2000));

  const inputs = await page.$$('input');
  if (inputs.length >= 3) {
    await inputs[0].type(USER);
    await inputs[1].type(PASS);
    await inputs[2].type(PASS);
  }

  // 点「创建管理员账号」
  const clicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.innerText.includes('创建管理员账号'),
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('点击创建按钮:', clicked);

  await new Promise((r) => setTimeout(r, 4000));
  console.log('注册后路径:', await page.evaluate(() => location.pathname));

  // 用会话直接打接口，确认两项能力都在
  const api = await page.evaluate(async () => {
    const get = async (url) => {
      const r = await fetch(url, { credentials: 'include' });
      const t = await r.text();
      return { status: r.status, body: t.slice(0, 200) };
    };
    return {
      me: await get('/api/v1/auth/me'),
      userMe: await get('/api/v1/user/me'),
      quota: await get('/api/v1/admin/quota'),
      schedule: await get('/api/v1/courses/schedule'),
    };
  });

  console.log('\n身份      :', api.me.status, api.me.body.slice(0, 120));
  console.log('用户接口  :', api.userMe.status, api.userMe.body.slice(0, 120));
  console.log('管理接口  :', api.quota.status);
  console.log('课表功能  :', api.schedule.status);

  await browser.close();
})();
