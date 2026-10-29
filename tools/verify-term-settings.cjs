/* 验证学期设置：配好起始日后，表头出现日期，「今天」高亮只在当周。 */
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

  // 先登录（管理员也能进用户工作台）
  await page.goto('https://card.clarkhub.cn/admin/login', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  const inputs = await page.$$('input');
  await inputs[0].type('moehaus');
  await inputs[1].type('wangjiahao2');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.innerText.includes('登录'))
      ?.click();
  });
  await new Promise((r) => setTimeout(r, 4500));
  console.log('登录后:', await page.evaluate(() => location.pathname));

  // 设置学期起始日：用今天往前推 2 周，确保落在第 3 周
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  console.log('设置第一周周一为:', iso);

  await page.evaluate((value) => {
    localStorage.setItem('clarkAamsTermStart', value);
    localStorage.setItem('clarkAamsLessonTimes', JSON.stringify(['08:30', '09:25', '10:30', '11:25']));
  }, iso);

  // 打开设置页看「学期与作息」
  await page.goto('https://card.clarkhub.cn/user/settings', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  const tabFound = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('学期与作息'));
    btn?.click();
    return !!btn;
  });
  await new Promise((r) => setTimeout(r, 1500));
  const settingsInfo = await page.evaluate(() => ({
    hasTab: document.body.innerText.includes('学期与作息'),
    hasStart: document.body.innerText.includes('第一周从哪天开始'),
    hasTimes: document.body.innerText.includes('每节课几点开始'),
    weekNote: (document.body.innerText.match(/今天是第\s*\d+\s*周/) || ['(无)'])[0],
    dateInputs: document.querySelectorAll('input[type=date]').length,
    timeInputs: document.querySelectorAll('input[type=time]').length,
  }));
  console.log('设置页:', JSON.stringify(settingsInfo, null, 0));

  // 打开课表页看表头日期
  await page.goto('https://card.clarkhub.cn/user/schedule', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 3000));
  const scheduleInfo = await page.evaluate(() => {
    const days = Array.from(document.querySelectorAll('.timetable__day')).map((d) => d.innerText.replace(/\s+/g, ' ').trim());
    const times = Array.from(document.querySelectorAll('.timetable__lesson span')).map((s) => s.innerText.trim()).filter(Boolean);
    const todayCells = document.querySelectorAll('.timetable__cell--today').length;
    const weekLabel = (document.body.innerText.match(/第\s*\d+\s*周/) || ['(无)'])[0];
    return { days, times, todayCells, weekLabel };
  });
  console.log('\n课表表头:', JSON.stringify(scheduleInfo.days));
  console.log('时间列:', JSON.stringify(scheduleInfo.times.slice(0, 4)));
  console.log('当前周:', scheduleInfo.weekLabel, '| 今日高亮格数:', scheduleInfo.todayCells);

  await browser.close();
})();
