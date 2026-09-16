// Run after building frontend. Requires Playwright and an installed Edge browser.
// PLAYWRIGHT_MODULE may point to a preinstalled Playwright package directory.
// All API requests are mocked; this test never connects to a real backend.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');

(async () => {
  const dist = path.resolve(__dirname, '../dist');
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const relative = /\.(js|css|png|svg|jpg|jpeg|webp|ico|woff2?)$/.test(pathname) ? pathname.slice(1) : 'index.html';
    const file = path.resolve(dist, relative);
    if (!file.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const content = await fs.readFile(file);
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : 'text/html');
      res.end(content);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const token = `test.${Buffer.from(JSON.stringify({ sub: 1, role: 'admin', name: 'UI Test', departmentId: 1, departmentName: 'Test Unit', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`;
    await context.addInitScript(value => localStorage.setItem('token', value), token);
    let statsFailed = true;
    let myReportedFailed = true;
    let matrixFailed = false;
    let patchFailed = true;
    let patchCount = 0;
    const errors = [];
    const risk = { id: 1, nrls_code: 'TEST001', risk_code: 'TEST001', risk_title: 'Synthetic risk', scope_level: 'hospital', department_id: '1', department_name: 'Test Unit', source: 'FMEA', category_name: 'Clinical', initial_likelihood: 2, initial_consequence: 3, initial_risk_score: 6, initial_risk_level: 'Medium', status: 'open', risk_owner_name: 'Test "Owner", Unit', reviews: [], review_frequency_months: 3 };
    const matrix = { totalConfirmed: 18, matrix: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ count: 0, items: [] }))) };
    matrix.matrix[4][1] = { count: 18, items: Array.from({ length: 5 }, (_, id) => ({ id: id + 1, detail: 'Synthetic example', status_risk: 'ตรวจสอบ' })) };
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (!['fetch', 'xhr'].includes(request.resourceType())) {
        if (url.origin !== origin) return route.abort();
        return route.continue();
      }
      let data = [];
      let status = 200;
      if (url.pathname === '/incidents/stats') { status = statsFailed ? 503 : 200; data = { total: 18, pending: 2, confirmed: 3, reviewing: 1, closed: 12, byLevel: { E: 2 }, activeSeverityByGoal: { clinical: { E: 2 } } }; }
      else if (url.pathname === '/incidents/tab-counts') data = { pending: 2, verified: 3, returnedForEdit: 1 };
      else if (url.pathname === '/incidents/my-reported') { status = myReportedFailed ? 503 : 200; data = { reportedThisMonth: 1, incidents: [], fiscalYearsList: [2026], selectedFiscalYear: 2026 }; }
      else if (url.pathname === '/incidents/form-data') data = { departments: [], locations: [], riskGroups: [], programs: [], risks: [] };
      else if (url.pathname === '/departments') data = [{ id: 1, depart_name: 'Test Unit', depart_group_id: 1 }];
      else if (url.pathname === '/risk-analysis') data = [risk];
      else if (url.pathname === '/risk-analysis/stats') data = { totalCount: 1, extremeCount: 0, highCount: 0, mediumCount: 1, neverEventCount: 0, dueSoonCount: 0 };
      else if (url.pathname === '/risk-analysis/nine-standards') data = [{ id: 1, number: 1, name: 'Synthetic standard', total: 1, withMeasures: 0, proactive: 1, profiles: [], incidents: [], mappedCodes: [] }];
      else if (url.pathname === '/incidents/matrix/stats') { data = matrix; status = matrixFailed ? 503 : 200; }
      else if (url.pathname === '/risk-analysis/1') {
        data = risk;
        if (request.method() === 'PATCH') { patchCount++; status = patchFailed ? 503 : 200; await new Promise(resolve => setTimeout(resolve, 500)); }
      }
      else if (url.pathname.includes('decision-support')) status = 503;
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/dashboard');
    await page.getByRole('alert').filter({ hasText: 'โหลดภาพรวมไม่สำเร็จ' }).waitFor();
    assert.equal(await page.getByText('เรื่องทั้งหมดที่ดูแลอยู่', { exact: true }).count(), 0);
    statsFailed = false;
    await page.getByRole('button', { name: 'โหลดภาพรวมใหม่' }).click();
    await page.getByText('เรื่องทั้งหมดที่ดูแลอยู่', { exact: true }).waitFor();
    await page.getByText('E: 2 (100%)', { exact: true }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'โหลดรายงานของคุณไม่สำเร็จ' }).waitFor();
    myReportedFailed = false;
    await page.getByRole('button', { name: 'โหลดรายงานอีกครั้ง', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'โหลดรายงานของคุณไม่สำเร็จ' }).waitFor({ state: 'hidden' });
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'riskhrms-ui-'));
    await page.screenshot({ path: path.join(output, 'dashboard-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Dashboard must not overflow on mobile');
    await page.screenshot({ path: path.join(output, 'dashboard-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin + '/reports');
    await page.getByRole('button', { name: 'แก้ไขข้อมูลความเสี่ยง', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'ชื่อความเสี่ยงตาม NRLS' }).getAttribute('readonly'), '');
    await page.locator('form textarea').first().fill('Synthetic edited draft');
    const failureDialog = page.waitForEvent('dialog');
    await page.getByRole('button', { name: 'บันทึกการแก้ไข', exact: true }).click();
    const failedSave = await failureDialog;
    assert.ok(failedSave.message().includes('แก้ไขล้มเหลว'));
    await failedSave.accept();
    await page.getByRole('button', { name: 'บันทึกการแก้ไข', exact: true }).waitFor();
    assert.equal(await page.locator('form textarea').first().inputValue(), 'Synthetic edited draft');
    patchFailed = false;
    await page.getByRole('button', { name: 'บันทึกการแก้ไข', exact: true }).click();
    await page.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).isDisabled(), true);
    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.getByRole('button', { name: 'กำลังบันทึก…', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(patchCount, 2, 'One failed attempt and one successful retry; repeated submit must not duplicate writes');
    await page.getByRole('button', { name: 'เมทริกซ์ 5x5 (Risk Matrix Heatmap)', exact: true }).click();
    const cell = page.getByRole('button').filter({ hasText: 'L2 × C5' });
    await cell.getByText('18 เคส', { exact: true }).waitFor();
    await cell.click();
    await page.getByText('พบอุบัติการณ์ทั้งหมด 18 ครั้ง · แสดงตัวอย่าง 5 รายการ (สูงสุด 5)', { exact: true }).waitFor();
    assert.equal(await page.getByText('Invalid Date', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, 'matrix-details.png') });
    await page.goto(origin + '/reports');
    await page.getByRole('button', { name: 'เมทริกซ์ 5x5 (Risk Matrix Heatmap)', exact: true }).click();
    await page.getByRole('button').filter({ hasText: 'L2 × C5' }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Reports must not overflow on mobile');
    await page.screenshot({ path: path.join(output, 'reports-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ส่งออก CSV', exact: true }).click();
    const csv = await fs.readFile(await (await download).path(), 'utf8');
    assert.ok(csv.includes('"5","2","10","18"'));
    assert.ok(!csv.includes('Synthetic risk'));
    await page.getByRole('button', { name: 'มาตรฐานสำคัญ 9 ด้าน (HA Goals)', exact: true }).click();
    const standardsDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'ส่งออก CSV', exact: true }).click();
    const standardsCsv = await fs.readFile(await (await standardsDownload).path(), 'utf8');
    assert.ok(standardsCsv.includes('Synthetic standard'));
    assert.ok(standardsCsv.includes('จำนวนทะเบียนที่เชื่อมโยง'));
    assert.ok(!standardsCsv.includes('Synthetic risk'));
    matrixFailed = true;
    await page.goto(origin + '/reports');
    await page.getByRole('button', { name: 'เมทริกซ์ 5x5 (Risk Matrix Heatmap)', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Incident Matrix' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ส่งออก CSV', exact: true }).isDisabled(), true);
    await page.goto(origin + '/incidents/new');
    await page.locator('textarea[name="detail"]').fill('Synthetic draft only');
    const dialog = page.waitForEvent('dialog');
    const cancel = page.getByRole('link', { name: 'ยกเลิก', exact: true }).click();
    await (await dialog).dismiss();
    await cancel;
    assert.ok(page.url().includes('/incidents/new'));
    assert.equal(await page.locator('textarea[name="detail"]').inputValue(), 'Synthetic draft only');
    assert.deepEqual(errors, []);
    console.log('PASS: dashboard and personal reports error/retry, mobile width, NRLS read-only, failed-save draft retention, duplicate submission, matrix counts/details/export/error, standards export, unsaved incident guard');
    console.log('Synthetic screenshots: ' + output);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
