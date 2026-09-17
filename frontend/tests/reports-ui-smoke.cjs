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
    await context.addInitScript(value => { if (!localStorage.getItem('token')) localStorage.setItem('token', value); }, token);
    let taskCountsFailed = false;
    let statsFailed = true;
    let myReportedFailed = true;
    let matrixFailed = false;
    let patchFailed = true;
    let patchCount = 0;
    let reportedIncidents = [];
    let decisionReady = false;
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
      else if (url.pathname === '/incidents/tab-counts') { status = taskCountsFailed ? 503 : 200; data = { pending: 2, verified: 3, returnedForEdit: 4 }; }
      else if (url.pathname === '/incidents/my-reported') { status = myReportedFailed ? 503 : 200; data = { reportedThisMonth: 1, incidents: reportedIncidents, fiscalYearsList: [2026], selectedFiscalYear: 2026 }; }
      else if (url.pathname === '/incidents/form-data') data = { departments: [], locations: [], riskGroups: [], programs: [], risks: [] };
      else if (url.pathname === '/departments') data = [{ id: 1, depart_name: 'Test Unit', depart_group_id: 1 }];
      else if (url.pathname === '/risk-analysis') data = [risk];
      else if (url.pathname === '/risk-analysis/stats') data = { totalCount: 1, extremeCount: 0, highCount: 0, mediumCount: 1, neverEventCount: 0, dueSoonCount: 0 };
      else if (url.pathname === '/risk-analysis/nine-standards') data = [{ id: 1, number: 1, name: 'Synthetic standard', total: 1, withMeasures: 0, proactive: 1, profiles: [], incidents: [], mappedCodes: ['TEST001', 'TEST002'] }];
      else if (url.pathname === '/incidents/matrix/stats') { data = matrix; status = matrixFailed ? 503 : 200; }
      else if (url.pathname === '/risk-analysis/1') {
        data = risk;
        if (request.method() === 'PATCH') { patchCount++; status = patchFailed ? 503 : 200; await new Promise(resolve => setTimeout(resolve, 500)); }
      }
      else if (url.pathname === '/incidents/101') data = {
        ...reportedIncidents[0], id: 101, id_risk: 0, reviews: [], structured_reviews: [],
        capa_actions: [{ id: 1, action: 'Synthetic workflow improvement', status: 'AWAITING_EFFECTIVENESS', responsible_display_name: 'Test owner', effectiveness_criteria: 'Synthetic criteria', baseline_value: '10', target_value: '2', effectiveness_reviews: [
          { id: 1, review_date: '2026-09-01', result: 'INEFFECTIVE', observation: 'Earlier synthetic review' },
          { id: 2, review_date: '2026-09-10', result: 'PARTIALLY_EFFECTIVE', measured_value: '4', observation: 'Synthetic follow-up observation' },
        ] }],
      };
      else if (url.pathname.startsWith('/rca/by-incident/')) data = null;
      else if (url.pathname.includes('decision-support')) {
        status = decisionReady ? 200 : 503;
        data = {
          scope: 'Test Unit', generatedAt: '2026-09-16T00:00:00Z',
          period: { days: 30, start: '2026-08-18', end: '2026-09-16', previousStart: '2026-07-19', previousEnd: '2026-08-17' },
          summary: { total: 2, severe: 0, nearMiss: 2, unsafeConditions: 0, unclassified: 0, rising: 1, repeated: 0 },
          proactive: { count: 1, total: 1 }, departments: [], followup: [],
          priorities: [3, 0].map((previous, index) => ({ code: `TEST00${index + 1}`, name: 'Synthetic signal', count: 1, previous, delta: 1 - previous, percent: null, severe: 0, nearMiss: 1, unsafeConditions: 0, repeatDepartments: 0, departments: [{ id: '1', name: 'Test Unit', count: 1, severe: 0 }] })),
          backlog: { rca: 0, overdueRca: 0, capa: 0, overdueCapa: 0, rcaItems: [], capaItems: [] },
          effectiveness: { total: 0, effective: 0, partial: 0, ineffective: 0, unassessed: 0, overdue: 0, items: [] },
        };
      }
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
    decisionReady = true;
    await page.goto(origin + '/reports');
    await page.getByRole('button', { name: 'มาตรฐานสำคัญ 9 ด้าน (HA Goals)', exact: true }).click();
    const standardTable = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'หน่วยงานเกิดซ้ำ', exact: true }) });
    await standardTable.waitFor();
    assert.match(await standardTable.locator('tbody tr').first().locator('td').nth(5).innerText(), /^0/);
    const trend = page.getByLabel('จำนวนรายงานเปลี่ยนแปลง -1');
    assert.ok((await trend.locator('span').getAttribute('class')).includes('text-blue-700'));
    await standardTable.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'standards-learning.png') });
    matrixFailed = true;
    await page.goto(origin + '/reports');
    await page.getByRole('button', { name: 'เมทริกซ์ 5x5 (Risk Matrix Heatmap)', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Incident Matrix' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'ส่งออก CSV', exact: true }).isDisabled(), true);
    reportedIncidents = [
      { id: 101, riskstore_name: 'Synthetic monitored report', nrls_code: 'TEST001', level_id: 'B', date_report: '2026-09-01', status_risk: 'จำหน่าย', improvement_status: 'MONITORING', rca_required: true },
      { id: 102, riskstore_name: 'Synthetic pending report', nrls_code: 'TEST002', level_id: 'A', status_risk: 'รายงาน', improvement_status: 'NOT_STARTED' },
    ];
    await page.goto(origin + '/my-reported');
    await page.getByRole('combobox', { name: 'กรองความคืบหน้ารายงานของฉัน' }).selectOption('monitoring');
    await page.getByRole('cell', { name: '#101', exact: true }).waitFor();
    assert.equal(await page.getByRole('cell', { name: '#102', exact: true }).count(), 0);
    await page.getByText('เข้าเกณฑ์ทบทวน RCA', { exact: true }).waitFor();
    myReportedFailed = true;
    await page.getByRole('button', { name: 'โหลดรายงานใหม่', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'โหลดรายงานของคุณไม่สำเร็จ' }).waitFor();
    assert.equal(await page.getByRole('cell', { name: '#101', exact: true }).count(), 0);
    myReportedFailed = false;
    await page.getByRole('button', { name: 'โหลดรายงานใหม่', exact: true }).click();
    await page.getByRole('link', { name: 'ดูความคืบหน้า', exact: true }).click();
    const feedback = page.getByRole('region', { name: 'สิ่งที่ดำเนินการจากรายงานนี้' });
    await feedback.waitFor();
    await feedback.getByText(/ผลประเมินที่บันทึกล่าสุด: ได้ผลบางส่วน/).waitFor();
    await feedback.getByText('อ่านมาตรการและหลักฐานการติดตาม', { exact: true }).click();
    await feedback.getByText('Synthetic follow-up observation', { exact: true }).waitFor();
    assert.equal(await feedback.getByRole('button').count(), 0, 'Reporter feedback must remain read-only');
    await feedback.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'incident-feedback.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await feedback.scrollIntoViewIfNeeded();
    assert.equal(await feedback.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: path.join(output, 'incident-feedback-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(origin + '/incidents/new');
    await page.locator('textarea[name="detail"]').fill('Synthetic draft only');
    const dialog = page.waitForEvent('dialog');
    const cancel = page.getByRole('link', { name: 'ยกเลิก', exact: true }).click();
    await (await dialog).dismiss();
    await cancel;
    assert.ok(page.url().includes('/incidents/new'));
    assert.equal(await page.locator('textarea[name="detail"]').inputValue(), 'Synthetic draft only');
    await page.locator('textarea[name="detail"]').fill('');
    reportedIncidents = [{ ...reportedIncidents[0], status_risk: 'แก้ไข' }, reportedIncidents[1]];
    for (const profile of [
      { role: 'staff' }, { role: 'staff', teamId: 1 }, { role: 'head' },
      { role: 'rm_committee', rmScope: 'hospital' }, { role: 'admin' },
    ]) {
      const roleToken = `test.${Buffer.from(JSON.stringify({ sub: 1, name: 'UI Test', departmentId: 1, exp: Math.floor(Date.now() / 1000) + 3600, ...profile })).toString('base64url')}.test`;
      await page.evaluate(value => localStorage.setItem('token', value), roleToken);
      await page.goto(origin + '/dashboard');
      const queue = page.getByRole('region', { name: 'งานที่ฉันต้องทำต่อ' });
      const personalLink = queue.getByRole('link').filter({ hasText: 'รายงานของฉันที่ต้องแก้ไข' });
      await personalLink.getByText('1 เรื่อง', { exact: true }).waitFor();
      assert.ok((await personalLink.getAttribute('href')).includes('followup=returned&fiscalYear=2026'));
      assert.equal(await queue.getByRole('link', { name: 'ติดตามมาตรการและกำหนดประเมินผล', exact: true }).count(), profile.rmScope === 'hospital' ? 1 : 0);
      assert.equal(await queue.getByRole('link', { name: 'งานทบทวนของทีม', exact: true }).count(), profile.teamId || profile.role === 'admin' ? 1 : 0);
      assert.equal(await queue.getByRole('link').filter({ hasText: 'ทบทวนเรื่องที่ยืนยันแล้ว' }).count(), ['head', 'rm_committee'].includes(profile.role) ? 1 : 0);
      if (profile.role === 'staff' && !profile.teamId) {
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
        await page.screenshot({ path: path.join(output, 'next-actions-staff-mobile.png') });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await personalLink.click();
        assert.equal(await page.getByRole('combobox', { name: 'กรองความคืบหน้ารายงานของฉัน' }).inputValue(), 'returned');
        await page.getByRole('cell', { name: '#101', exact: true }).waitFor();
        assert.equal(await page.getByRole('cell', { name: '#102', exact: true }).count(), 0);
      }
      if (profile.role === 'admin') {
        taskCountsFailed = true;
        await page.reload();
        await queue.getByText('โหลดจำนวนงานบางส่วนไม่สำเร็จ ยังเปิดรายการเพื่อตรวจสอบได้', { exact: true }).waitFor();
        await personalLink.getByText('1 เรื่อง', { exact: true }).waitFor();
        taskCountsFailed = false;
        await queue.getByRole('button', { name: 'โหลดจำนวนงานอีกครั้ง' }).click();
        await queue.getByRole('link').filter({ hasText: 'ติดตามเรื่องที่ส่งกลับในขอบเขตดูแล' }).getByText('4 เรื่อง', { exact: true }).waitFor();
        await page.screenshot({ path: path.join(output, 'next-actions-admin.png') });
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: dashboard and personal reports error/retry, mobile width, NRLS read-only, failed-save draft retention, duplicate submission, matrix counts/details/export/error, standards export and repeat signals, incident follow-up feedback, unsaved incident guard');
    console.log('Synthetic screenshots: ' + output);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
