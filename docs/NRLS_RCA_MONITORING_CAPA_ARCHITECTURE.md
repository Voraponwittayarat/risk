# NRLS → RCA → CAPA → Monitoring architecture

## Decision

`riskregister.nrls_code` is the canonical clinical/general risk identity. Local `riskstore_id` is retained as optional context and is never used as the primary join key for RCA or Monitoring.

RCA policy is centralized in `IncidentRcaPolicyService`. The evaluated result, explanation, due date, and policy version are persisted on the Incident so a later reviewer can reproduce why RCA was required. The frontend only renders `rca_required`, `recommended_rca_type`, `rca_status`, and the backend explanation.

CAPA uses a central `capa_action` read/write model. Existing `standard_rca_capa` and `rca_cmp` rows remain intact; new Standard RCA CAPAs are projected to `capa_action`. This avoids destructive migration of historical RCA forms while giving Monitoring one stable source for owner, due date, status, evidence, Incident, NRLS, and Risk Profile.

Risk Profiles are unique by `nrls_code + scope_level + scope_identifier`. Incident aggregation joins by `nrls_code`, date period, confirmed classification, and scope. `risk_title` and NRLS names are snapshots for display only.

## NRLS cutover policy

- Full NRLS operation starts on 1 October 2026 (1 October 2569 BE), using the incident date as the boundary.
- Historical incidents before the cutover that have no deterministic NRLS match remain `nrls_code = NULL` with `classification_status = LEGACY`.
- Legacy unmatched incidents are excluded from the mandatory Data Quality queue and do not require retrospective confirmation.
- Incidents dated on or after the cutover cannot be created or edited without a valid NRLS master code.
- NRLS Monitoring aggregation cannot start before the cutover; an earlier requested period is clamped to 1 October 2026.

## Existing rules preserved in policy version WC-RCA-2026.08-NRLS-1

- High severity `G/H/I` or `4/5` requires Standard RCA.
- Trigger Tool adverse event or section 41 requires Standard RCA.
- High-potential-harm Near Miss requires RCA.
- The existing nine-important-standards list is preserved, but is resolved from its legacy local IDs to NRLS before evaluation.

## RM decisions still required

- Do not guess NRLS for unmatched historical entries. Only records with an approved deterministic mapping carry NRLS forward.
- Approve definitive SLA values. The current operational defaults are 24 hours for Standard and 72 hours for Mini/Concise and are explicitly versioned.
- Approve whether moderate non-nine-standard events should recommend Mini or Concise; existing behavior (Mini) is preserved.
- Review all program and severity mismatches in the Data Quality Queue; the migration never silently changes historical `program_id` or severity.

## Security and audit

RCA, Risk Analysis, CAPA, and Data Quality endpoints require JWT authentication. Data Quality and manual reevaluation are limited to RM/head/admin roles; queries are narrowed to the user’s department/group/hospital scope. Classification, RCA evaluation, and CAPA progress create audit records. Tokens are environment configuration only. Telegram may include the NRLS name and a 160-character summary from `problem_basic` after masking common HN/AN/CID, national ID, phone, and name patterns; it never falls back to `detail` or uses `detail_hosxp`.
