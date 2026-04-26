import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const EXE = '/home/cristian/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const OUT = '/tmp/hatcher-v3-screens';
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];
const ROUTES = [
  { p: '/',          name: 'home' },
  { p: '/pricing',   name: 'pricing' },
  { p: '/frameworks',name: 'frameworks' },
  { p: '/blog',      name: 'blog' },
  { p: '/login',     name: 'login' },
  { p: '/register',  name: 'register' },
  { p: '/forgot-password', name: 'forgot' },
  { p: '/privacy',   name: 'privacy' },
  { p: '/help',      name: 'help' },
  { p: '/affiliate', name: 'affiliate' },
];

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const consoleErrors = {};
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const r of ROUTES) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
      page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
      try {
        await page.goto('http://localhost:3000' + r.p, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(800);
        const file = path.join(OUT, `${vp.name}-${r.name}.png`);
        await page.screenshot({ path: file, fullPage: false });
        consoleErrors[`${vp.name}-${r.name}`] = errors;
        console.log(`OK ${vp.name} ${r.p}  errors=${errors.length}`);
      } catch (e) {
        console.log(`FAIL ${vp.name} ${r.p} :: ${e.message.slice(0, 120)}`);
      }
      await page.close();
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'console-errors.json'), JSON.stringify(consoleErrors, null, 2));
  await browser.close();
  console.log('DONE — screens at', OUT);
})();
