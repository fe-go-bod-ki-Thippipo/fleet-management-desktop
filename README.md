# Fleet & Machinery Desktop v0.4.3 — Asset UX Review

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะปัจจุบัน: **Asset UX Review Build** — ปรับส่วนข้อมูลทรัพย์สินให้ตรวจรับได้ง่ายขึ้น โดยคงความสามารถขั้นต่ำของ v0.13.4 และใช้ Requirement ล่าสุดเป็นเกณฑ์ก่อนขยับไปโมดูลอื่น

## จุดที่ปรับใน v0.4.3

- Asset Detail ตัด Timeline ล่าสุดออกจากหน้า `ข้อมูลทั่วไป` และใช้ `ประวัติ/Audit` เป็นประวัติหลักเพียงจุดเดียว
- `ประวัติ/Audit` เพิ่ม Search, ประเภทเหตุการณ์, ช่วงวันที่, ปุ่ม `ล้างตัวกรอง` และเปิดดู Before/After ได้
- ตัดชุด Completeness/Important Documents ที่ซ้ำด้านล่างออกจากแท็บข้อมูลทั่วไป
- Header แยก `ข้อมูลพื้นฐาน xx%` ออกจาก `เอกสารสำคัญ x/3 รายการ` เพื่อไม่ให้ 100% ถูกตีความว่าเอกสารครบทั้งหมด
- เอกสารสำคัญคงสถานะแยก ภาษี / พ.ร.บ. / ประกันภัย
- Asset Form เปลี่ยนเป็น **Grouped Form Standard** แบ่งหมวด: ข้อมูลพื้นฐาน, รายละเอียดทางเทคนิค, การจัดสรรและหน่วยงาน, การได้มาและมูลค่า, หมายเหตุ
- Grouped Form มีเมนูหมวดด้านซ้าย, ปุ่มบันทึกมาตรฐาน และพื้นที่ข้อมูลอ่านง่ายขึ้น
- Grouped Form Standard จะใช้เป็นมาตรฐานฟอร์มยาวของโมดูลอื่นในรอบถัดไป

## Minimum parity ที่ยังคงอยู่

- Role context: Admin / Manager / Clerk / Fleet Officer / Requester / Viewer
- Menu permission, Action permission และ Data Scope ระดับ Company / Operating Unit
- Global Asset Search + Notification สำหรับเอกสารใกล้หมดอายุ
- Asset Register 90 รายการ พร้อม Pagination, Search/Status Filter, คอลัมน์ตาม v0.13.4 และปุ่มแก้ไขตาม Permission
- Canonical Owner Registry / Person / Employee / User Account / Master Data relations
- Global + per-asset Documents, Dynamic Document Fields, Renewal/Version foundation
- Usage / Approval / Assignment / Return workflow foundation
- Maintenance / PM / Incident, Fuel / Expense, Reports
- Audit และ Backup/Restore
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
Fleet-Machinery-Desktop-0.4.3-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.3-Portable-x64.exe
```

GitHub Actions artifact:

```text
fleet-desktop-v0.4.3-windows
```

รอบนี้ให้ตรวจรับส่วน Asset ก่อน: Asset Registry → Asset Detail → ข้อมูลทั่วไป → ฟอร์มแก้ไข → เอกสารสำคัญ → Audit จากนั้นจึงค่อยขยับไปโมดูลอื่น

GitHub Actions ตั้งให้ Build เฉพาะ `workflow_dispatch` หรือ Push Tag `v*` เพื่อไม่สร้าง run ทุก commit
