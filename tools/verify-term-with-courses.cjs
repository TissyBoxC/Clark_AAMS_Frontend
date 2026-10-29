/*
 * 给当前登录账号导入真实课表，再检查课表页表头。
 *
 * 用管理员账号（同时具备用户能力）登录，调用导入接口把真实课表写进去，
 * 然后看课表页是否显示日期。
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = 'D:\\service\\clark_aams\\Clark_AAMS_Backend\\src\\test\\resources\\jit-grid';

(async () => {
  const outer = fs.readFileSync(path.join(ROOT, 'frame-outer.html'), 'utf8');
  const body = fs.readFileSync(path.join(ROOT, 'schedule-body.html'), 'utf8');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  await page.goto('https://card.clarkhub.cn/admin/login', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 2500));
  const inputs = await page.$$('input');
  await inputs[0].type('moehaus');
  await inputs[1].type('wangjiahao2');
  await page.evaluate(() => {
    Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('登录'))?.click();
  });
  await new Promise((r) => setTimeout(r, 4500));

  // 导入真实课表到该账号
  const importResult = await page.evaluate(async (payload) => {
    const res = await fetch('/api/v1/imports/courses/html', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, count: (json?.data?.courses ?? []).length };
  }, {
    school: 'jit',
    schoolName: '金陵科技学院',
    html: outer,
    frames: [{ src: 'content_xs.aspx', id: 'iframeautoheight', html: body }],
  });
  console.log('导入:', JSON.stringify(importResult));

  // 设置学期起始日为两周前（应落在第 3 周）
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 14);
  const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  await page.evaluate((value) => {
    localStorage.setItem('clarkAamsTermStart', value);
    localStorage.setItem('clarkAamsLessonTimes', JSON.stringify(['08:30', '09:25', '10:30', '11:25']));
  }, iso);

  await page.goto('https://card.clarkhub.cn/user/schedule', { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const days = Array.from(document.querySelectorAll('.timetable__day')).map((d) =>
      d.innerText.replace(/\s+/g, ' ').trim(),
    );
    const times = Array.from(document.querySelectorAll('.timetable__lesson span'))
      .map((s) => s.innerText.trim())
      .filter(Boolean);
    return {
      days,
      times: times.slice(0, 6),
      todayCells: document.querySelectorAll('.timetable__cell--today').length,
      courseBlocks: document.querySelectorAll('.timetable__course, .timetable__cell button').length,
      pageText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
    };
  });

  console.log('表头:', JSON.stringify(info.days));
  console.log('时间列:', JSON.stringify(info.times));
  console.log('今日高亮格:', info.todayCells, '| 课程块:', info.courseBlocks);
  console.log('页面:', info.pageText);

  await browser.close();
})();
