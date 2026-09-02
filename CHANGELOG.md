# v0.4.2 — v0.13.4 Parity Correction
- Promote the current correction batch to v0.4.2 so it is distinguishable from the earlier v0.4.1 Baseline RC.
- Restore Asset Registry layout/behavior from v0.13.4: status filters, active filter chip, v0.13.4 columns, age, Home/Managing Unit, meter, Edit action and 10/20/50 pagination.
- Restore Asset General side panels for Data Completeness and Important Document checklist (Tax / พ.ร.บ. / Insurance) using live document records.
- Restore global Documents category cards, filtered counts, search, status/30-60-90/date-range filters, Clear Filters, filtered CSV export, v0.13.4 table columns and pagination.
- Keep document forms dynamic by Document Type: Tax, พ.ร.บ., Insurance, Inspection and Other with type-specific fields.
- Restore Settings/Master information architecture from v0.13.4 with five grouped cards: Types, Brand/Model, Color/Fuel, Organization/People/Owner, Documents/Insurance.
- Keep Role/Menu/Action Permission, Company/Operating Unit Data Scope, Owner Registry, Person/User, Calendar, Audit, Usage, Maintenance/PM, Fuel/Expense and Backup foundations from v0.4.1.
- Align package version, Desktop shell, runtime state, JSON backup metadata, README, tests, static checks and GitHub Actions artifact naming to v0.4.2.
- Expected Windows artifacts: Fleet-Machinery-Desktop-0.4.2-Setup-x64.exe and Fleet-Machinery-Desktop-0.4.2-Portable-x64.exe.
- Runtime acceptance on the newly built Windows EXE is still required before final parity PASS.

# v0.4.1 — v0.13.4 Baseline RC
- Restore role context for Admin, Manager, Clerk, Fleet Officer, Requester and Viewer.
- Add menu permission, action permission and Company/Operating Unit Data Scope enforcement.
- Add Global Asset Search and document-expiry notifications with click-through.
- Upgrade Asset Form to canonical references with Type→Brand→Model and Brand→Color dependent selection.
- Upgrade Asset Profile with completeness, primary photo, important documents and audit timeline.
- Upgrade Owner Registry with authorization/reimbursement fields, edit/deactivate and reference-delete guard.
- Upgrade Person/Employee Master with HR reference fields and separate User Account architecture.
- Upgrade Master Data with stable-ID edit/deactivate/delete guard and relationship fields.
- Add real Month Calendar grid for Usage, Maintenance and PM events.
- Upgrade Audit with search, detail and CSV export.
- Keep 90 imported real Asset Master rows and Electron + SQLite offline persistence.

# v0.4.0
- Rebuild parity acceptance around v0.13.4 requirements rather than reduced Desktop shell.
- Restore Asset fields/profile/documents/photos/master/owner/person-user/audit foundations.
- Add offline admin Usage request + printable approval/return document.
- Enable Maintenance, PM, Incident, Fuel and Expense functional test workflows.
- Persist complete state in SQLite and retain 90 imported real assets.
