# Current Requirements — v0.4.8 Document Core Consolidation Review

Status: **Review / Runtime Acceptance in progress**

This file is the version-specific acceptance contract. Read it together with `FLEET-PROJECT-CONTEXT.md`.

## Current State

v0.4.8 is based on the v0.13.4 functional baseline and consolidates document behavior into an authoritative document core. Static checks/tests and the Windows build have passed, but this version is **not yet a locked runtime-accepted baseline**.

Product Owner feedback so far: overall v0.4.8 is considered generally OK. A suspected search-input regression was rechecked and withdrawn; search currently accepts input normally. Therefore **do not modify search behavior without a reproducible issue**.

## Acceptance Requirements

### REQ-01A — Duplicate Version Handling

- Prevent creation of another canonical document by ordinary Add when the same Asset + Document Type already exists.
- Direct the user to Renewal instead.
- Renewal determines the next version from the actual linked chain.
- Do not silently renumber/destroy existing legacy duplicate records.
- Legacy/Unlinked duplicates remain separately identifiable and may be Admin soft-deleted.

### REQ-01B — Actual-ID Version Chain

- Version chain uses `previousVersionId` and `supersededById` with actual Document IDs.
- Do not infer canonical relationships from version number alone.
- Legacy/Unlinked records must not be silently merged into the canonical chain.
- Required visible navigation behavior:
  - v1: **Next only**
  - v2/v3/later: **Previous only**
  - v2 must not visibly show both Previous and Next.

### REQ-02 — Expense / Cost — Regression Lock

- Document expense/cost behavior and display must remain functional.

### REQ-03 — Renewal Source ID — Regression Lock

- Renewal keeps a source document reference.
- Source Asset and Document Type are locked/derived from the source.
- Renewal must originate from the current/latest eligible document.
- Source Document ID must remain identifiable.
- Source/new document relationships use actual IDs.

### REQ-04 — Photo Management — Regression Lock

Asset photo management must remain functional: upload/add, replace/delete as implemented, and main-photo behavior must not regress.

### REQ-05 — Owner Display

Owner display should remain readable on one line where designed, using actual Owner Registry names rather than legacy pseudo-company labels.

### REQ-06 — Asset Status — Regression Lock

Asset status selection/behavior introduced before v0.4.8 must remain functional.

### REQ-07 — Exact Historical Version Detail

Opening a historical document version must render fields and attachment from the exact selected Document ID, not from the latest document or another record with the same type/version label.

### BUG-v046-01 — Attachment Viewer

Attachment preview/open behavior must work in the desktop runtime.

Current intended behavior:
- In-app viewer is the primary preview mechanism.
- Images can render as images.
- PDF/compatible content can render in an embedded viewer where Electron permits.
- Download/open fallback may be provided.
- Historical versions must preview the attachment belonging to the exact selected Document ID.

This is a high-priority runtime acceptance item because attachment opening failed in earlier versions.

### REQ-08 — Document Registry Layout / Interaction

Registry must retain:
- category cards: all / tax / act / insurance / inspect / other;
- search;
- status filter;
- expiry-range filter;
- expiry date from/to;
- reset filters;
- filtered CSV export;
- pagination 10 / 20 / 50;
- columns for asset, type, document number, expiry, remaining, cost, attachment, version, status and management;
- user-facing asset plate/name rather than internal code where available;
- row click to detail;
- action buttons that do not accidentally trigger row navigation.

### REQ-09 — Expiry Remaining Days

Readable states:
- `เหลือ N วัน`
- `หมดอายุวันนี้`
- `หมดอายุแล้ว N วัน`

Expired / near-expiry / normal states should remain visually distinguishable.

### REQ-10 — Admin Soft Delete

- Delete is Admin-only.
- Confirmation is required.
- Delete is soft-delete, retaining deletion metadata/audit.
- Non-admin must be denied.
- Deleted documents are excluded from active UI.
- If a linked document is removed, canonical neighboring links must remain logically valid.
- Audit must record the delete action.

## Mandatory Runtime Scenarios

1. Renew a current document twice. Confirm a canonical `v1 → v2 → v3` ID-linked chain without duplicate canonical versions.
2. Open v1: only Next v2 is visible. Open v2: only Previous v1 is visible. Open v3: only Previous v2 is visible.
3. Open v1/v2/v3 and confirm each attachment belongs to the exact selected Document ID.
4. Attempt ordinary Add for the same Asset + Document Type and confirm the system blocks it and directs the user to Renewal.
5. Confirm a non-admin cannot delete a document.
6. As Admin, soft-delete a Legacy/Unlinked duplicate; confirm it disappears from active UI, audit remains, and the canonical chain is intact.
7. Recheck REQ-02 / REQ-03 / REQ-04 / REQ-06 / REQ-07 for regression.
8. Recheck Document Registry search/filter/reset/pagination/row-click behavior.
9. Recheck attachment viewer in the actual packaged Windows runtime.

## Regression Locks

Do not regress:
- v0.13.4 functional baseline;
- Asset Registry/detail/edit behavior already restored;
- Expense;
- Renewal Source ID;
- Photo Management;
- Asset Status;
- Exact Historical Version Detail;
- Search input behavior currently confirmed as working.

## Reviewer Instruction

A reviewer should distinguish:

- **CRITICAL:** data corruption/loss, broken canonical relationships, security/permission bypass, or a core runtime blocker.
- **NEED FIX:** implementation does not satisfy a stated requirement or causes a confirmed regression.
- **PASS:** implementation appears consistent with the stated requirement based on code/tests available.
- **SUGGESTION:** optional improvement that is not part of the current requirement.

Do not convert suggestions into requirements and do not redesign locked UX without Product Owner instruction.