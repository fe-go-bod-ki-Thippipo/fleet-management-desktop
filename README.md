# Fleet & Machinery Desktop v0.4.1 — v0.13.4 Baseline RC

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะปัจจุบัน: **Baseline RC** — ฟังก์ชันขั้นต่ำจาก v0.13.4 ถูกยกกลับเข้าตัว Desktop แล้วในระดับ Source/Static Acceptance แต่ยังต้องผ่าน **runtime acceptance บน Windows EXE** ก่อนประกาศเป็น Desktop Parity Baseline อย่างเป็นทางการ

## Minimum parity ที่รวมใน v0.4.1

- Role context: Admin / Manager / Clerk / Fleet Officer / Requester / Viewer
- Menu permission และ Data Scope ระดับ Company / Operating Unit
- Global Asset Search + Notification สำหรับเอกสารใกล้หมดอายุ
- Asset Register 90 รายการ พร้อม Owner / Company / Department / Location / Home Unit / Managing Unit / Person / Meter
- Asset Form แบบ canonical reference และ Type → Brand → Model, Brand → Color filtering
- Asset Profile: รูปหลัก/หลายรูป, completeness, important documents, tabs และ timeline/audit
- Global + per-asset Documents, filter/search/status/30-60-90/date range/pagination/CSV และ renewal foundation
- Canonical Owner Registry พร้อม reimbursement fields, deactivate และ reference-delete guard
- Person / Employee Master แยก User Account, HR Employee ID, Fleet Roles และ Data Scope
- Master Data stable IDs พร้อม edit/deactivate/delete guard และ relation fields
- Calendar แบบ Month grid สำหรับ Usage / Maintenance / PM พร้อม click-through
- Usage / Approval / Assignment / Return workflow foundation
- Maintenance / PM / Incident, Fuel / Expense, Reports
- Audit search/detail/CSV
- JSON + SQLite Backup/Restore
- Windows NSIS Installer + Portable EXE build configuration

## Feature Parity Matrix

ใช้ `docs/FEATURE-PARITY-MATRIX-v0.13.4.md` เป็น Requirement checklist และ acceptance reference หลัก ห้ามลดความสามารถของ v0.13.4 เพื่อแลกกับการทำ Desktop ให้ง่ายขึ้น

## Build / runtime acceptance

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์ที่คาดหวัง:

```text
Fleet-Machinery-Desktop-0.4.1-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.1-Portable-x64.exe
```

หลัง Build ให้ทดสอบ Portable ก่อน โดยตรวจ Role/Scope, Asset CRUD/Profile, Document renewal/filter, Owner/Person/Master reference, Calendar, Usage workflow, Audit และ Backup/Restore ก่อนประกาศ Baseline PASS

GitHub Actions ตั้งให้ Build เฉพาะ `workflow_dispatch` หรือ Push Tag `v*` เพื่อไม่สร้าง run ทุก commit
