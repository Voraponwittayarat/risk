# Home and reporting regression checks

From the repository root, run the CSV and matrix contract tests with a Node.js
runtime that supports TypeScript type stripping (verified with Node.js 24.18):

```powershell
node --test frontend/tests/reportCsv.test.mjs frontend/tests/learningSignals.test.mjs
```

Build `frontend` with `npm run build`, then run:

```powershell
node frontend/tests/reports-ui-smoke.cjs
```

The browser check requires Playwright and Microsoft Edge. If Playwright is bundled
outside the project, set `PLAYWRIGHT_MODULE` to that package directory first.
The test starts its own loopback server and mocks every API request. It does not
read `.env`, contact a backend, or create clinical records. Screenshots use only
synthetic data and are saved in the operating system's temporary directory.

Coverage: failed dashboard and personal-report loading and retry, mobile
overflow, read-only NRLS identity, preserving drafts after failed saves,
duplicate submit protection, the API's 5x5 matrix array and totals, five-item
drill-down limits, matrix and standards CSV exports, failed export loading,
and declining to leave an unsaved incident through a navigation link.
Learning checks cover same-code repeat signals, neutral report-count trends,
personal-report follow-up filtering, and read-only action/effectiveness feedback.
Home task checks cover staff, team members, heads, hospital RM and admin;
personal returned reports stay separate from scoped queues, fiscal-year/filter
links open the matching list, and a failed queue can retry without hiding the
personal count. Mobile layout is checked with synthetic data.

Backend scope regression tests (from `backend`):

```powershell
npm test -- --runInBand risk-analysis.service.spec.ts incidents.service.spec.ts
```
