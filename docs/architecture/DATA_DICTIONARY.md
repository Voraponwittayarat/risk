# RiskHRMS Data Dictionary

This document outlines the core tables and data definitions used within the RiskHRMS system, serving as the bridge between the legacy Thai-named schemas and the modernized ORM mappings.

## Core Tables

### 1. `riskregister` (Incident Reports)
The primary table storing all clinical and operational incidents.
- **`id`** (INT): Primary Key.
- **`riskstore_id`** (INT): FK linking to the specific incident classification (`riskstore`).
- **`date_report`** (DATE): The date the incident occurred.
- **`level_id`** (VARCHAR): Severity of the incident (e.g., 'A' through 'I', '3', '4', '5').
- **`detail`** (TEXT): Narrative description of the incident.
- **`detail_hosxp`** (TEXT): Manually recorded HOSxP reference identifiers (e.g., HN).
- **`affected`** (VARCHAR): Serialized array of affected parties (comma-separated).
- **`department_id`** (VARCHAR): FK linking to the reporting/responsible department.
- **`status_risk`** (VARCHAR): Current workflow status (e.g., 'Pending Review', 'Closed').
- **`link_key`** (VARCHAR): Secure token used for LINE Notify deep links.

### 2. `riskstore` (Risk Catalog)
Defines the types of risks that can be reported.
- **`id`** (INT): Primary Key.
- **`riskstore_name`** (VARCHAR): Name of the risk.
- **`riskgroup_id`** (INT): FK linking to broader risk categories.

### 3. `level` (Severity Matrix)
Defines the severity levels and their corresponding rules.
- **`level_code`** (VARCHAR): The severity character (e.g., 'E').
- **`level_name`** (TEXT): Description of the severity.
- **`level_warning_code`** (VARCHAR): Determines the SLA or escalation rules for this severity.

### 4. `edit_log` (Audit Trail)
Append-only log tracking changes to `riskregister` records.
- **`id`** (INT): Primary Key.
- **`edit_by`** (VARCHAR): Username of the editor.
- **`riskregister_id`** (INT): FK to the modified record.
- **`columnname`** (VARCHAR): The field that was modified.
- **`old`** (TEXT): Value before modification.
- **`new`** (TEXT): Value after modification.
- **`created_at`** (TIMESTAMP): Time of edit.
