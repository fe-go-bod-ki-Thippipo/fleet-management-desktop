# CHANGELOG

## v0.2.0

- ยกระดับจาก Desktop Foundation เป็น Functional MVP
- เพิ่ม Asset CRUD: เพิ่ม/แก้ไข/Soft Delete, สถานะ, เลขไมล์/ชั่วโมง, บริษัท, Site, Owner และผู้รับผิดชอบ
- เพิ่ม Usage Workflow: คำขอใช้, ตรวจช่วงเวลาซ้อน, พิมพ์ใบขอ, บันทึกอนุมัติ, เลขไมล์/เชื้อเพลิงก่อนใช้, บันทึกคืนและปิดงาน
- เพิ่มการอัปเดต Meter Reading และเลขไมล์/ชั่วโมงปัจจุบันของ Asset เมื่อคืนรถ
- เพิ่ม Person / Employee Master แบบ Local
- เพิ่ม Settings สำหรับ Company, Site และ Owner Registry
- เพิ่ม Backup และ Restore SQLite จากหน้าจอ
- เพิ่ม syntax validation ของ JavaScript ใน `npm run check`
- ปรับ GitHub Actions ให้ Build อัตโนมัติเมื่อ push เข้า `main` และเมื่อ push tag `v*`
- Windows Build ยังคงรองรับ NSIS Installer และ Portable EXE
- Maintenance, PM, Fuel/Cost และ Incident ยังเป็น Schema Foundation และจะเปิด Workflow ในรุ่นถัดไป

## v0.1.2

- เพิ่ม Windows build/packaging foundation ด้วย electron-builder
- เพิ่ม `npm run build:win`, `build:installer`, `build:portable`
- เพิ่ม NSIS installer target และ Portable EXE target
- เพิ่ม GitHub Actions workflow สำหรับ Build Windows EXE
- เพิ่ม `asarUnpack` และ native dependency rebuild สำหรับ better-sqlite3
- อัปเดต Version เป็น 0.1.2

## v0.1.1
- เพิ่ม `index.html` ที่ root ของ repository
- เปลี่ยน Electron Main Process ให้โหลด root `index.html`
- ปรับ build config ให้รวม root `index.html`

## v0.1.0
- Initial Fleet Desktop foundation.
