# v0.4.1 — v0.13.4 Baseline RC
- Restore role context for Admin, Manager, Clerk, Fleet Officer, Requester and Viewer.
- Add menu permission, action permission and Company/Operating Unit Data Scope enforcement.
- Add Global Asset Search and document-expiry notifications with click-through.
- Upgrade Asset Form to canonical references with Type→Brand→Model and Brand→Color dependent selection.
- Upgrade Asset Profile with completeness, primary photo, important documents and audit timeline.
- Upgrade global Documents with search, category/status, 30/60/90-day and date-range filters, pagination and CSV export.
- Upgrade Owner Registry with authorization/reimbursement fields, edit/deactivate and reference-delete guard.
- Upgrade Person/Employee Master with HR reference fields and separate User Account architecture.
- Upgrade Master Data with stable-ID edit/deactivate/delete guard and relationship fields.
- Add real Month Calendar grid for Usage, Maintenance and PM events.
- Upgrade Audit with search, detail and CSV export.
- Keep 90 imported real Asset Master rows and Electron + SQLite offline persistence.
- Update static checks/tests and Windows artifacts to v0.4.1.
- Runtime acceptance on Windows EXE remains required before final parity PASS.

# v0.4.0
- Rebuild parity acceptance around v0.13.4 requirements rather than reduced Desktop shell.
- Restore Asset fields/profile/documents/photos/master/owner/person-user/audit foundations.
- Add offline admin Usage request + printable approval/return document.
- Enable Maintenance, PM, Incident, Fuel and Expense functional test workflows.
- Persist complete state in SQLite and retain 90 imported real assets.
