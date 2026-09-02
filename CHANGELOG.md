# CHANGELOG

## v0.3.0

- กำหนด Desktop Parity Baseline: ฟังก์ชันพื้นฐานต้องไม่น้อยกว่า Web Prototype v0.13.4 ในส่วน Asset / Documents / Owner / Person / Master / Audit
- เพิ่ม Asset Detail / Profile พร้อมแท็บข้อมูลทั่วไป, เอกสาร, Meter History และ Audit
- เพิ่มเอกสารรวมทั้งระบบ พร้อมค้นหาและกรองหมดอายุ/ใกล้หมดอายุ
- เพิ่ม Document Detail สำหรับประกัน/พ.ร.บ./ภาษี และ Attachment Path
- เพิ่ม Document Renewal แบบสร้าง Version ใหม่และเก็บ Version เดิม
- เพิ่ม Master Data UI: Vehicle Type, Brand, Model, Color, Body Type, Fuel Type, Document Type
- เพิ่ม Owner Registry UI และ reimbursement eligibility
- เพิ่ม Person/Employee Master + Fleet Operational Roles
- เพิ่ม User Account แยกจาก Person พร้อม System Role / Data Scope / Auth Provider foundation
- เพิ่ม Audit Log UI
- คง Usage Offline Workflow: คำขอ → พิมพ์เอกสาร → อนุมัติ → Meter ก่อนใช้ → คืน → Meter หลังใช้ → ปิดงาน
- เพิ่ม schema สำหรับ Master, Person Role, Asset Photo, Document Detail และ App Setting
- คง Maintenance / PM / Fuel / Expense / Incident เป็น Foundation ตาม Architecture ที่ล็อกไว้
- ปรับ GitHub Actions ให้ Build เมื่อ Run workflow เองหรือ Push Tag `v*` เท่านั้น เพื่อลด Build ซ้ำจาก commit ย่อย

## v0.2.0

- ยกระดับจาก Desktop Foundation เป็น Functional MVP
- เพิ่ม Asset CRUD: เพิ่ม/แก้ไข/Soft Delete, สถานะ, เลขไมล์/ชั่วโมง, บริษัท, Site, Owner และผู้รับผิดชอบ
- เพิ่ม Usage Workflow: คำขอใช้, ตรวจช่วงเวลาซ้อน, พิมพ์ใบขอ, บันทึกอนุมัติ, เลขไมล์/เชื้อเพลิงก่อนใช้, บันทึกคืนและปิดงาน
- เพิ่มการอัปเดต Meter Reading และเลขไมล์/ชั่วโมงปัจจุบันของ Asset เมื่อคืนรถ
- เพิ่ม Person / Employee Master แบบ Local
- เพิ่ม Settings สำหรับ Company, Site และ Owner Registry
- เพิ่ม Backup และ Restore SQLite จากหน้าจอ

## v0.1.2
- เพิ่ม Windows build/packaging foundation ด้วย electron-builder
- เพิ่ม NSIS Installer + Portable EXE
- เพิ่ม GitHub Actions workflow

## v0.1.1
- เพิ่ม root `index.html` และปรับ Electron Main Process

## v0.1.0
- Initial Fleet Desktop foundation.
