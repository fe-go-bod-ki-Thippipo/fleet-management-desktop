# Fleet & Machinery Desktop v0.4.2 — v0.13.4 Parity Correction

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะปัจจุบัน: **Parity Correction Build** — ปรับ Asset Registry, Asset Detail, Documents และ Settings/Master Data ให้ย้อนกลับไปยึด Layout/Behavior ของ v0.13.4 มากขึ้น หลังพบว่ารุ่น v0.4.1 ยังลดรายละเอียดบางส่วนจากต้นแบบ

## Minimum parity ที่รวมใน v0.4.2

- Role context: Admin / Manager / Clerk / Fleet Officer / Requester / Viewer
- Menu permission, Action permission และ Data Scope ระดับ Company / Operating Unit
- Global Asset Search + Notification สำหรับเอกสารใกล้หมดอายุ
- Asset Register 90 รายการ พร้อม Pagination, Search/Status Filter, คอลัมน์ตาม v0.13.4 และปุ่มแก้ไขตาม Permission
- Asset Form แบบ canonical reference และ Type → Brand → Model, Brand → Color filtering
- Asset Profile: รูปหลัก/หลายรูป, completeness, important-document checklist, tabs และ timeline/audit
- Global + per-asset Documents พร้อม category cards, search/status/30-60-90/date range, clear filters, pagination, filtered CSV export และ renewal/version foundation
- Dynamic Document Form แยกฟิลด์ตาม ภาษีรถ / พ.ร.บ. / ประกันภัย / ตรวจสภาพ / เอกสารอื่น
- Canonical Owner Registry พร้อม reimbursement fields, deactivate และ reference-delete guard
- Person / Employee Master แยก User Account, HR Employee ID, Fleet Roles และ Data Scope
- Settings/Master Data แบบ 5 กลุ่มตาม v0.13.4 พร้อม stable IDs, edit/deactivate/delete guard และ relation fields
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
Fleet-Machinery-Desktop-0.4.2-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.2-Portable-x64.exe
```

GitHub Actions artifact:

```text
fleet-desktop-v0.4.2-windows
```

หลัง Build ให้ทดสอบ Portable ก่อน โดยเทียบหน้าหลักกับ v0.13.4 โดยเฉพาะ Asset Registry, Asset Detail/Checklist, Documents/Dynamic Fields/Filters และ Settings/Master Data รวมถึง Role/Scope, Usage workflow, Audit และ Backup/Restore

GitHub Actions ตั้งให้ Build เฉพาะ `workflow_dispatch` หรือ Push Tag `v*` เพื่อไม่สร้าง run ทุก commit
