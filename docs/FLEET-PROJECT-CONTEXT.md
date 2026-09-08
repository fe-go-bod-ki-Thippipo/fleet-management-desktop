# Fleet & Machinery Management — Project Context

> Shared project context for GPT development and Claude code review.
> This document describes stable project intent and constraints. Version-specific work belongs in `CURRENT-REQUIREMENTS.md`.

## 1. Project Purpose

Fleet & Machinery Management is a desktop/offline-first system for managing company vehicles and agricultural machinery. The system covers assets, vehicle/machinery usage, documents, maintenance/PM, incidents, fuel and expenses, personnel, reports, audit/history, and administration.

The original functional source of truth is the web prototype **v0.13.4**. Desktop development must preserve its required functionality unless the Product Owner explicitly changes a requirement.

## 2. Technology / Runtime

- Desktop application: Electron
- UI: HTML/CSS/JavaScript renderer
- Local persistence: SQLite with a current state/JSON snapshot bridge
- Offline-first operation
- Windows build distributed as an EXE/package
- GitHub is the source-control and review/build workflow

Important: passing static checks, automated tests, or a Windows build does **not** prove runtime acceptance. Runtime behavior must be verified separately by the Product Owner.

## 3. Architecture Direction

Target architecture is **Distributed Offline + Central Control**:

- Each Site can operate an offline Desktop + SQLite database.
- Central control manages Site, Device, User, Role, Permission, Data Scope and master policies.
- Synchronization/data exchange must be designed around stable IDs and metadata such as UUID/business code/site/device/user/timestamps/version/sync/deleted/source.
- Soft-delete, conflict handling and auditability are important data principles.
- Attachments currently have legacy/state behavior and are not yet the final filesystem architecture.

## 4. Data Ownership

- HR is the source of truth for identity, employment and organization data.
- Fleet owns Fleet-specific roles, permissions and assignments.
- Employee/Person is separate from User Account.
- Fleet Person records may map to HR references in the future.
- Company, Site and Operating Unit are separate organizational concepts.
- Owner Registry is the source of truth for asset ownership.

## 5. Functional Baseline

**v0.13.4 is the locked functional baseline.**

Desktop work must not silently remove, simplify or redesign baseline functionality. If a reviewer sees a simpler implementation than the baseline, treat it as a possible regression unless a current requirement explicitly authorizes the change.

Major functional areas include:

- Dashboard / Overview
- Asset Registry and Asset Detail
- Vehicle and machinery usage
- Documents and renewals
- Maintenance / PM
- Incidents
- Fuel / expenses
- Personnel and users
- Reports
- Audit/history
- Settings / master data / permissions

## 6. Locked Asset UX / Behavior

### Asset Registry

- Preserve v0.13.4-style useful columns and data.
- Permitted users have an Edit action per row.
- Pagination supports 10 / 20 / 50.
- Search/filter state should survive returning from edit where applicable.
- Status filters are supported.
- Row click opens Asset Detail.
- Filtered pages provide a clear/reset-filter action.

### Asset Detail

Final tab order:

1. ข้อมูลทั่วไป
2. เอกสาร
3. ไฟล์/รูป
4. การใช้งาน
5. ซ่อม/PM
6. เชื้อเพลิง/ค่าใช้จ่าย
7. ประวัติ/Audit

General tab must not contain duplicate completeness/document-summary sections or a duplicate Timeline. Header indicators separate basic-data completeness from important-document completeness.

Important documents are Tax, พ.ร.บ. and Insurance.

Audit is the read-only history center and should support date/time, actor, event type, module, description, before→after details, search/filter/reset and expandable detail.

### Asset Edit

- Grouped form with clear sections and section navigation/cards.
- Avoid duplicate legacy fields in the primary form.
- Preserve required v0.13.4 fields.
- Legacy import information may be read-only/secondary.
- Sticky/footer actions where appropriate.
- Photo management is required.
- Asset status selector is required.
- Owner must show real owner names, not legacy pseudo-company labels.

## 7. Locked Document UX / Behavior

Document Registry requirements include:

- Category cards/counts.
- Search.
- Status filter.
- Expiry range/date filters.
- Clear filters.
- Export filtered data.
- Pagination 10 / 20 / 50.
- User-facing asset display should prefer plate/name instead of internal FL-/MC- codes.
- Dynamic forms for Tax / พ.ร.บ. / Insurance / Inspection / Other.
- Attachments must be previewable/openable.
- Renewal and version history.
- Row click opens document detail.
- Expense/cost column.
- Source Document ID semantics for renewal.
- Human-readable expiry remaining days.
- Admin-only soft delete with audit retention.

### Document Version Rules

- A new document for the same Asset + Document Type must not create a duplicate canonical version chain; the user should use renewal.
- Canonical chain relationships use actual Document IDs through `previousVersionId` / `supersededById`, not matching by version number alone.
- Existing Legacy/Unlinked duplicate records remain separate from the canonical chain unless explicitly cleaned up.
- Historical document detail and attachment must come from the **exact selected Document ID**.
- Renewal must identify and lock its source document.
- Current review UX rule: v1 shows Next only; v2/v3/later versions show Previous only.

## 8. Global Interaction Standards

- Main data-table rows should open their detail view where defined.
- Action buttons inside clickable rows must stop row navigation when appropriate.
- Every filtered page should provide `ล้างตัวกรอง` / equivalent reset.
- Search fields must allow continuous typing without focus/cursor loss caused by destructive re-rendering.
- Grouped forms are preferred for large data-entry screens.
- Do not introduce stacked monkey patches when a coherent authoritative module can own the behavior.

## 9. Permissions / Audit

Known role keys include `admin`, `manager`, `clerk`, `fleetOfficer`, `requester`, `viewer`.

Audit should cover important actions such as login, create/edit/delete, approval, status changes, assignments, checkout/return, document upload/renewal, PM, permission changes and backup/restore where implemented.

Deletion of important operational records should prefer soft-delete when required by the module, preserving audit/history.

## 10. Review Roles

- **Product Owner:** defines requirements and performs final Windows runtime acceptance.
- **GPT:** developer; changes code, tests, documentation, GitHub branches/PRs and builds.
- **Claude:** independent code/QA reviewer; reviews implementation and produces actionable findings/prompts for GPT.

Claude must not redefine locked requirements. New ideas should be labeled `Suggestion`, separate from `Required Fix`.

GPT must evaluate Claude findings against this project context and current requirements before applying them; reviewer suggestions are not automatically requirements.

## 11. Definition of Done

A feature/version is not accepted merely because source code exists or CI is green. For a release/baseline to be considered accepted:

1. Current requirements are implemented.
2. Regression locks remain functional.
3. Relevant automated checks/tests pass.
4. Windows build succeeds when required.
5. Reviewer has no unresolved blocking issue.
6. Product Owner performs runtime acceptance and confirms the required behavior.

Do not label a version/baseline as locked or runtime-accepted before step 6.