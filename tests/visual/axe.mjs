import { chromium } from 'playwright';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const EXE = '/home/cristian/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const summary = {};
for (const route of ['/', '/pricing', '/login', '/register', '/privacy']) {
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000' + route, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () => {
    // @ts-ignore
    return await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
  });
  summary[route] = {
    violations: results.violations.map(v => ({
      id: v.id, impact: v.impact, nodes: v.nodes.length,
      help: v.help, helpUrl: v.helpUrl,
      sample: v.nodes[0]?.target || []
    })),
  };
  console.log(`${route}: ${results.violations.length} violations`);
  await page.close();
}
fs.writeFileSync('/tmp/hatcher-v3-screens/axe.json', JSON.stringify(summary, null, 2));
await browser.close();
