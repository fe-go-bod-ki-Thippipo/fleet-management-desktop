# Feature Parity Matrix — Fleet Web v0.13.4 → Fleet Desktop

> Source of truth: `fleet-management.html` v0.13.4.
> Desktop is **not allowed to be called parity-complete** until every MUST row below is `PASS` and its acceptance check is satisfied.
>
> Status: `PASS` = implemented to equivalent depth, `PARTIAL` = exists but reduced/incomplete, `MISSING` = not implemented, `VERIFY` = code exists but runtime acceptance not yet confirmed.

## A. App Shell / Navigation / Role Context

| ID | v0.13.4 Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| A01 | Version visible in app | v0.4.0 visible | PASS | App shell shows current version |
| A02 | Role-based entry / role context | No equivalent role switch | MISSING | Can enter/test as Admin/Manager/Clerk/Fleet/Requester/Viewer |
| A03 | Sidebar grouped navigation | Grouped sidebar exists | PARTIAL | Same functional groups and role/menu visibility |
| A04 | Menu permission filtering | Not equivalent | MISSING | Hidden/visible menus follow menu permission matrix |
| A05 | Company switch for global roles | Not equivalent | MISSING | Global role can switch company scope |
| A06 | Operating Unit switch / data scope | OU exists but scope enforcement incomplete | PARTIAL | Global/unit scope consistently filters every module |
| A07 | Global asset search | Asset page search only | PARTIAL | Top-level search reaches asset/detail source |
| A08 | Notification bell + unread indicator | Not equivalent | MISSING | Notification list, unread count, click-through |
| A09 | Click-through navigation from references | Limited | PARTIAL | Asset/person/doc/unit references open source record |

## B. Permission / Data Scope / Integrity

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| B01 | Action-level permission matrix | No equivalent enforcement | MISSING | create/update/approve/assign/checkout/return/etc enforced |
| B02 | Menu permission matrix | No equivalent | MISSING | menu visibility configurable per role |
| B03 | Data Scope separate from Permission | Data fields exist | PARTIAL | all list/detail/report queries enforce data scope |
| B04 | Company/Site/OU scope | Basic entities exist | PARTIAL | central sees all; local sees authorized scope only |
| B05 | Soft Delete | Some state records use deleted | PARTIAL | all syncable entities use soft delete consistently |
| B06 | Row version / optimistic conflict guard | Not equivalent | MISSING | edit detects stale row/version conflict |
| B07 | Audit before/after/reason | Basic audit exists | PARTIAL | before/after, user, role, time, reason captured |
| B08 | Reference-delete guard | Not equivalent | MISSING | referenced Company/Person/Owner/Master cannot hard delete |
| B09 | Deactivate/reactivate instead of destructive delete | Some masters active flag | PARTIAL | consistent across canonical masters |

## C. Dashboard

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| C01 | Asset KPI cards | Exists | PASS | active/available totals shown |
| C02 | Document expiry KPIs | Exists basic | PARTIAL | expired/30/60/90-day logic + click-through |
| C03 | Operating Unit summary | Not equivalent | MISSING | OU-level utilization/status summary |
| C04 | Asset utilization/status visualization | Not equivalent | MISSING | status/utilization breakdown |
| C05 | Alerts panel | Basic only | PARTIAL | expiring docs/maintenance/issues click through |
| C06 | Quick actions | Not equivalent | MISSING | configurable/useful operational shortcuts |
| C07 | Today usage/activity panel | Not equivalent | MISSING | today usage/booking/return items |
| C08 | Recent asset/activity list | Not equivalent | MISSING | recent records clickable |
| C09 | Dashboard filters by company/unit/period | Not equivalent | MISSING | dashboard reacts to scope + period filters |

## D. Asset Registry

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| D01 | 90 actual Asset Master rows | Seed 90 exists | PASS | 90 current real assets present |
| D02 | Vehicle + machinery categories | Exists | PASS | correct meter unit and category |
| D03 | Search by code/plate/brand/type | Exists | PASS | responsive search without re-render typing bug |
| D04 | Filter by company | Exists | PASS | correct company filtering |
| D05 | Filter by OU/status/type | Reduced | PARTIAL | all v0.13.4 relevant filters available |
| D06 | Asset code | Exists | PASS | stable business code |
| D07 | Plate/name + province | Exists | PASS | editable and displayed |
| D08 | Asset type canonical master | Exists basic | PARTIAL | selected by ID; no free-text fallback needed after migration |
| D09 | Asset category | Exists | PASS | vehicle/machinery/equipment |
| D10 | Owner Registry reference | Exists | PARTIAL | all assets map to canonical owner; no plain-owner duplicate source |
| D11 | Company reference | Exists | PASS | canonical company reference |
| D12 | Department reference | Exists basic | PARTIAL | master CRUD + filter + reference guard |
| D13 | Location reference | Exists basic | PARTIAL | master CRUD + filter + reference guard |
| D14 | Home Operating Unit | Exists | PARTIAL | canonical values + data scope behavior |
| D15 | Managing Operating Unit | Exists | PARTIAL | canonical values + data scope behavior |
| D16 | Responsible Person | Exists | PARTIAL | canonical Person Master only |
| D17 | Brand ID | Exists | PARTIAL | Type→Brand filtering enforced |
| D18 | Model ID | Exists | PARTIAL | Brand+Type→Model filtering enforced |
| D19 | Color ID | Exists | PARTIAL | optional Brand→Color relation enforced |
| D20 | Body Type ID | Exists | PARTIAL | canonical master and reference safety |
| D21 | Fuel Type ID | Exists | PARTIAL | canonical master |
| D22 | Model Year | Exists | PASS | editable/displayed |
| D23 | VIN / chassis | Exists | PASS | editable/displayed |
| D24 | Engine number | Exists | PASS | editable/displayed |
| D25 | Acquisition date/year | Exists date | PARTIAL | derived acquisition year + age |
| D26 | Acquisition price | Exists | PASS | numeric value |
| D27 | Meter current reading + unit | Exists | PASS | km/hour supported |
| D28 | Asset status model | Reduced labels/status logic | PARTIAL | available/inuse/repair/disabled/disposed semantics |
| D29 | Data completeness indicator | Not equivalent | MISSING | completeness score/required-field issues visible |
| D30 | Source/import metadata | Not equivalent UI | PARTIAL | source row/import batch retained and inspectable |

## E. Asset Detail / History

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| E01 | Full asset hero/profile | Exists reduced | PARTIAL | matches v0.13.4 information depth |
| E02 | Main photo + thumbnails | Basic gallery | PARTIAL | thumbnail selection + primary photo |
| E03 | Multi-photo upload | Exists basic | PARTIAL | JPG/PNG/WebP multiple upload |
| E04 | Set primary photo | Not equivalent | MISSING | selectable primary photo |
| E05 | Delete/manage photo | Exists delete | PARTIAL | primary reassignment and audit |
| E06 | Summary strip: owner/unit/age/meter/docs/etc | Reduced | PARTIAL | equivalent summary metrics |
| E07 | General/overview tab | Exists | PARTIAL | full field coverage |
| E08 | Documents tab | Exists | PARTIAL | detail/open/renew/version behavior |
| E09 | Attachments/files tab | Photos only | PARTIAL | generic file attachments metadata + storage |
| E10 | Notes tab / history notes | Not equivalent | MISSING | notes/history entries preserved |
| E11 | Usage tab | Exists | PARTIAL | linked usage records + click-through |
| E12 | Maintenance/PM tab | Exists | PARTIAL | linked work orders/plans/history |
| E13 | Fuel/expense tab | Exists | PARTIAL | linked transactions and totals |
| E14 | Audit/history tab | Exists | PARTIAL | chronological before/after timeline |
| E15 | Asset timeline | Not equivalent | MISSING | unified asset events timeline |
| E16 | Related person mini-card | Not equivalent | MISSING | owner/responsible/driver links |
| E17 | Important docs mini-summary | Reduced | PARTIAL | tax/act/insurance status with click-through |

## F. Documents

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| F01 | Global document registry | Exists | PASS | all-asset document list |
| F02 | Per-asset document registry | Exists | PASS | asset tab list |
| F03 | Categories tax/act/insurance/inspect/other | Exists | PASS | canonical document type/category |
| F04 | Search | Reduced | PARTIAL | title/no/asset search |
| F05 | Status filters | Reduced | PARTIAL | active/superseded/inactive/expired |
| F06 | 30/60/90 day filters | Exists partially | PARTIAL | exact remaining-day filter behavior |
| F07 | Date range filter | Not equivalent | MISSING | filter by expiry/coverage date range |
| F08 | Category counts | Not equivalent | MISSING | counts by document category |
| F09 | Remaining days | Basic | PARTIAL | displayed and status color semantics |
| F10 | Pagination 10/20/50 | Not equivalent | MISSING | selectable page size and pagination |
| F11 | CSV export | Not equivalent | MISSING | export current filtered result |
| F12 | Edit document metadata | Exists | PARTIAL | all fields editable |
| F13 | Replace attached PDF | Not equivalent | MISSING | replace file while preserving record/history policy |
| F14 | Renewal creates new version | Exists basic | PARTIAL | old version becomes superseded; links both directions |
| F15 | Version history | Reduced | PARTIAL | full chain visible/openable |
| F16 | Activate/deactivate document | Not equivalent | MISSING | inactive state without destructive delete |
| F17 | Tax-specific fields | Exists basic | PARTIAL | tax amount + renewal/payment + expiry |
| F18 | พ.ร.บ. specific fields | Exists basic | PARTIAL | insurer/policy/premium/coverage |
| F19 | Insurance-specific fields | Exists basic | PARTIAL | class/sum/repair condition/premium/coverage |
| F20 | Insurance company master | Exists | PARTIAL | master CRUD/deactivate/delete guard |
| F21 | Attachment open/store in App Data | Not equivalent end-to-end | PARTIAL | copied into managed App Data, not arbitrary fragile path |

## G. Owner Registry

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| G01 | Canonical Owner Registry | Exists | PASS | one owner source for asset ownership |
| G02 | Owner types company/employee/person/external/other | Reduced | PARTIAL | all owner types supported |
| G03 | Reference to Company/Person instead of duplicate identity | Exists conceptually | PARTIAL | source reference drives display name |
| G04 | Usage class company_owned/private_for_work/unverified | Exists | PASS | correct classifications |
| G05 | Fuel reimbursement eligibility | Exists | PASS | editable/displayed |
| G06 | Repair reimbursement eligibility | Exists | PASS | editable/displayed |
| G07 | Authorization start/end | Not confirmed | PARTIAL | editable/displayed |
| G08 | Reimbursement note | Not equivalent | MISSING | editable/displayed |
| G09 | Activate/deactivate | Exists | PARTIAL | with reference safety |
| G10 | Delete guard | Not equivalent | MISSING | cannot delete referenced owner |
| G11 | Canonical private owners PER01/PER02 mapping | Patch exists | VERIFY | all applicable assets map correctly |

## H. Person / Employee / User / Driver

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| H01 | Single Person/Employee Master | Exists | PARTIAL | no duplicate editable person masters |
| H02 | Employee ID | Exists basic | PARTIAL | editable/import-ready |
| H03 | Company/Department/Position | Exists basic | PARTIAL | canonical references |
| H04 | Contact email/phone | Exists | PASS | editable |
| H05 | Source Local/HR + HR Employee ID | Not equivalent UI | MISSING | integration fields visible/managed |
| H06 | Multiple fleet work roles | Exists basic | PARTIAL | driver/custodian/requester/approver/fleet/owner/systemUser |
| H07 | Driver qualification/license | Reduced | PARTIAL | type/no/expiry/qualification/status |
| H08 | User Account separate from Person | Exists | PARTIAL | canonical account records, not embedded duplicate |
| H09 | Login email | Exists | PASS | account field |
| H10 | System role | Exists | PASS | role field |
| H11 | Data scope | Exists field | PARTIAL | enforced in UI/data queries |
| H12 | Auth provider | Exists | PASS | field maintained |
| H13 | Operating Unit IDs | Exists | PARTIAL | editable and enforced |
| H14 | Active/inactive account | Exists | PASS | cannot delete current account / deactivate supported |
| H15 | HR package integration foundation | Architecture exists outside UI | VERIFY | import contract can map HR Employee→Person |

## I. Organization / Master Data

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| I01 | Company Master | Exists | PARTIAL | CRUD/deactivate/reference guard |
| I02 | Site Master | Reduced/OU-centric | PARTIAL | site entity and scope relationship preserved |
| I03 | Operating Unit Master | Exists | PARTIAL | Central + Garden 1 + Garden 2 default baseline |
| I04 | Department Master | Exists basic | PARTIAL | CRUD/deactivate/reference guard |
| I05 | Location Master | Exists basic | PARTIAL | CRUD/deactivate/reference guard |
| I06 | Vehicle Type Master | Exists | PARTIAL | stable short IDs + CRUD/deactivate |
| I07 | Machinery Type Master | Exists | PARTIAL | stable short IDs + CRUD/deactivate |
| I08 | Brand Master | Exists | PARTIAL | many-to-many Brand↔Type |
| I09 | Model Master | Exists | PARTIAL | Brand + Type relation |
| I10 | Color Master | Exists | PARTIAL | optional Brand relation |
| I11 | Body Type Master | Exists | PARTIAL | stable ID + CRUD/deactivate |
| I12 | Fuel Type Master | Exists | PARTIAL | stable ID + CRUD/deactivate |
| I13 | Document Type Master | Exists | PARTIAL | stable ID + category mapping |
| I14 | Insurance Company Master | Exists | PARTIAL | CRUD/deactivate/reference guard |
| I15 | Short stable IDs separated from display name | Exists partly | PARTIAL | editing name never changes stable ID |
| I16 | Type→Brand→Model dependent dropdowns | Not enforced to parity | MISSING | cascading selection implemented |
| I17 | Brand→Color filter | Not equivalent | MISSING | color options filtered where relation exists |
| I18 | Prevent hard-delete referenced master | Not equivalent | MISSING | reference guard |

## J. Calendar

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| J01 | Calendar page | Basic list-like page | PARTIAL | true calendar grid |
| J02 | Month view | Not equivalent | MISSING | month calendar |
| J03 | Week view | Not equivalent | MISSING | week calendar |
| J04 | Day view | Not equivalent | MISSING | day calendar |
| J05 | Category filters | Not equivalent | MISSING | usage/booking/repair/PM/disabled |
| J06 | Asset type filter | Not equivalent | MISSING | vehicle/machinery |
| J07 | Status filter | Not equivalent | MISSING | relevant event/status filter |
| J08 | Do not show generic 'available' events | Not equivalent | MISSING | only meaningful events shown |
| J09 | Click event→source detail | Limited | PARTIAL | click-through to booking/asset/maintenance |
| J10 | CSV export | Not equivalent | MISSING | filtered calendar export |

## K. Usage Workflow

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| K01 | Clerk records request for employee | Exists | PARTIAL | requested-for separate from recorded-by |
| K02 | Draft→Pending | Exists | PARTIAL | proper transition guard |
| K03 | Manager approve/reject | Exists basic | PARTIAL | permission + reason + audit |
| K04 | Manager allocation/final asset decision | Exists basic | PARTIAL | proposed asset distinct from allocated asset |
| K05 | Need-driver handling | Reduced | PARTIAL | qualified/available driver selection |
| K06 | Vehicle availability overlap check | Exists basic | PARTIAL | excludes closed/rejected/cancelled correctly |
| K07 | Driver overlap check | Not equivalent | MISSING | prevents overlapping driver assignment |
| K08 | Assigned→Wait Pickup | Reduced | PARTIAL | explicit state |
| K09 | Checkout | Exists | PARTIAL | permission + timestamp + meter + fuel |
| K10 | In use→Returned | Exists | PARTIAL | return meter/fuel/condition/damage |
| K11 | Returned→Closed | Exists | PARTIAL | close workflow and final audit |
| K12 | Resource/status recalculation | Reduced | PARTIAL | asset status derives from usage/maintenance |
| K13 | Printable usage/work-order document | Exists | PARTIAL | A4 form with signatures and complete fields |
| K14 | Notifications on pending/approval/etc | Not equivalent | MISSING | workflow notifications |

## L. Maintenance / PM / Incident

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| L01 | Maintenance work order | Exists basic | PARTIAL | full workflow fields/status/actions |
| L02 | Maintenance transition guard | Reduced | PARTIAL | valid transitions only |
| L03 | Vendor/service provider master | Not equivalent | MISSING | provider master + reference |
| L04 | PM plans | Exists basic | PARTIAL | date/meter trigger support |
| L05 | PM history | Reduced | PARTIAL | completed PM records/history |
| L06 | Asset status affected by open maintenance | Reduced | PARTIAL | automatic status recalculation |
| L07 | Incident registry | Exists basic | PARTIAL | incident CRUD/status/cost/docs |
| L08 | Incident attachments | Not equivalent | MISSING | file/photo attachments |
| L09 | Maintenance/incident click-through | Limited | PARTIAL | asset/work-order/source links |

## M. Fuel / Expense / Cost

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| M01 | Fuel transactions | Exists basic | PARTIAL | date, asset, qty, price, amount, meter, vendor/source |
| M02 | Expense ledger | Exists basic | PARTIAL | categorized expenses linked to asset/source |
| M03 | Owner reimbursement eligibility usage | Not integrated | MISSING | policy affects reimbursement workflow/visibility |
| M04 | Source-aware cost | Reduced | PARTIAL | usage/maintenance/incident/document/fuel source links |
| M05 | Asset cost summary | Reduced | PARTIAL | total and category breakdown |
| M06 | Monthly filters | Reduced | PARTIAL | asset/unit/company/type/period filters |

## N. Reports

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| N01 | Report page | Exists basic | PARTIAL | report builder equivalent |
| N02 | Filter by asset | Reduced | PARTIAL | selectable asset |
| N03 | Filter by OU | Reduced | PARTIAL | OU selector |
| N04 | Filter by company/site/type | Reduced | PARTIAL | all filters supported |
| N05 | Date range | Reduced | PARTIAL | from/to period |
| N06 | Usage report | Reduced | PARTIAL | exportable |
| N07 | Fuel report | Reduced | PARTIAL | exportable |
| N08 | Maintenance/PM report | Reduced | PARTIAL | exportable |
| N09 | Cost report | Reduced | PARTIAL | exportable |
| N10 | Asset history report | Reduced | PARTIAL | exportable |
| N11 | CSV/Excel export | Not equivalent | MISSING | spreadsheet export |
| N12 | PDF export/print | Not equivalent | MISSING | printable report/PDF workflow |

## O. Notifications

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| O01 | Notification collection | Not equivalent | MISSING | persisted notifications |
| O02 | Role-targeted notifications | Not equivalent | MISSING | target roles/units/users |
| O03 | Unread/read state | Not equivalent | MISSING | unread count and mark read |
| O04 | Document expiry alerts | Dashboard only | PARTIAL | notification records generated |
| O05 | Booking pending alerts | Not equivalent | MISSING | approver notification |
| O06 | Click-through target | Not equivalent | MISSING | opens relevant source record |

## P. Audit / Backup / Restore / Data Foundation

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| P01 | Audit list/search/filter | Basic list | PARTIAL | search + module/action filters |
| P02 | Audit detail before/after | Not equivalent | MISSING | detail modal/diff |
| P03 | Export audit CSV | Not equivalent | MISSING | export current audit |
| P04 | SQLite backup | Exists | PASS | produces valid SQLite backup |
| P05 | SQLite restore | Exists | PASS | restore + restart safely |
| P06 | JSON export/import | README claims but not verified | VERIFY | explicit export/import with schema/version validation |
| P07 | Restore permission | Not equivalent | MISSING | only authorized role can restore |
| P08 | Data Foundation diagnostics | Not equivalent | MISSING | counts/normalized-model diagnostics |
| P09 | Schema/version metadata | State version only | PARTIAL | explicit schema + migration version |
| P10 | Migration path from legacy/v0.13.4 | Seed import only | PARTIAL | deterministic migration preserving user-entered data |
| P11 | Attachment migration to managed file storage | Not equivalent | MISSING | no inline/base64 legacy dependency for Desktop |

## Q. Desktop-specific acceptance

| ID | Requirement | Desktop v0.4.0 | Status | Acceptance criteria |
|---|---|---|---|---|
| Q01 | Electron offline app | Exists | PASS | runs without internet |
| Q02 | SQLite persistence | Exists | PASS | state persists across restart |
| Q03 | Managed App Data path | Exists for DB | PARTIAL | DB + all attachments managed under App Data |
| Q04 | Windows Installer EXE | Build config exists | VERIFY | GitHub Action produces installable Setup EXE |
| Q05 | Windows Portable EXE | Build config exists | VERIFY | GitHub Action produces runnable Portable EXE |
| Q06 | GitHub Actions check/test/build | Exists | PASS | manual/tag workflow only |
| Q07 | Runtime smoke test after packaging | Not automated | MISSING | packaged app launches and core pages load |

---

# Summary

This matrix intentionally marks the current Desktop conservatively. Presence of a function name is **not** enough for `PASS`; behavior, data relationships, permissions, history, and acceptance criteria must match v0.13.4 depth.

Current conclusion: **Desktop v0.4.0 is NOT parity complete.** It is a recovery build with a large number of `PARTIAL` and `MISSING` rows.

# Implementation order (locked)

1. **Parity Block 1 — Core governance**: Role/Permission/Menu/Data Scope, Company/Site/OU, reference guards, audit integrity.
2. **Parity Block 2 — Asset Master**: all canonical fields, dependent masters, completeness, status logic, 90-asset mapping.
3. **Parity Block 3 — Asset Detail**: gallery/primary photo, tabs, timeline, related records, click-through.
4. **Parity Block 4 — Documents**: global + per-asset, filters, 30/60/90, pagination, CSV, renewal/version/inactive, managed attachments.
5. **Parity Block 5 — Owner/Person/User**: canonical ownership, reimbursement policy, Person roles, Driver qualification, separate User Account.
6. **Parity Block 6 — Calendar/Notifications**: Month/Week/Day, filters, event links, notification center.
7. **Parity Block 7 — Usage Workflow**: clerk→approval→allocation→checkout→return→close with availability/driver conflict and print form.
8. **Parity Block 8 — Maintenance/PM/Incident + Fuel/Cost**: full workflows and source-aware costs.
9. **Parity Block 9 — Reports/Audit/Backup**: filters/export/PDF, audit detail/export, migration/restore validation.
10. **Parity Block 10 — Desktop packaging acceptance**: packaged runtime smoke test + Setup/Portable EXE validation.

# Release rule

- Do not label a Desktop release `Parity Baseline` while any MUST row is `MISSING`, `PARTIAL`, or `VERIFY`.
- GitHub Actions may build test EXEs during recovery, but a green build means only **build/test passed**, not **feature parity passed**.
- Only after this matrix is all `PASS` should the release be promoted to `Desktop Parity Baseline`.
