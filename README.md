# Fleet & Machinery Desktop v0.2.0

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline สำหรับบริหารรถยนต์และเครื่องจักร ใช้ Electron + SQLite และออกแบบให้ต่อยอดไปสู่ระบบ Central/HR Integration ในอนาคตได้

## ฟังก์ชันที่ใช้งานได้ใน v0.2.0

- Dashboard สรุปทรัพย์สินและรายการใช้งาน
- Asset CRUD: เพิ่ม/แก้ไข/ลบแบบ Soft Delete, ทะเบียน, สถานะ, เลขไมล์/ชั่วโมง, เจ้าของ, ผู้รับผิดชอบ, บริษัท และ Site
- Usage Workflow: บันทึกคำขอ, ตรวจรายการซ้อน, พิมพ์ใบขอใช้, บันทึกผลอนุมัติ, เลขไมล์/เชื้อเพลิงก่อนใช้, บันทึกคืน, เลขไมล์/เชื้อเพลิงหลังใช้ และปิดงาน
- Person / Employee Master แบบ Local พร้อมโครงเชื่อม HR
- Settings: Company, Site และ Owner Registry
- Backup / Restore SQLite
- Audit foundation
- Windows Installer + Portable EXE ผ่าน electron-builder
- GitHub Actions สร้างไฟล์ `.exe` อัตโนมัติเมื่อ push เข้า `main`, push tag `v*` หรือ Run workflow เอง

## โมดูลที่วาง Schema แล้วแต่ยังไม่เปิด Workflow เต็ม

- Maintenance / Repair / Work Order
- PM Plan / Schedule
- Fuel Transaction
- Expense Ledger / Cost
- Incident
- HR Package Integration

## ทดลองรัน

```bash
npm install
npm start
```

## สร้าง Windows EXE

```bash
npm install
npm run check
npm test
npm run build:win
```

ไฟล์จะอยู่ใน `release/` โดย target หลักคือ:

```text
Fleet-Machinery-Desktop-0.2.0-Setup-x64.exe
Fleet-Machinery-Desktop-0.2.0-Portable-x64.exe
```

## GitHub Actions

ไปที่ **Actions → Build Windows EXE** แล้วเลือก **Run workflow** หรือ push เข้า `main` ระบบจะ Build และเก็บไฟล์ `.exe` เป็น Artifact ให้อัตโนมัติ

## Data Location

โปรแกรมเก็บฐานข้อมูล SQLite และไฟล์งานไว้ใน App Data ของผู้ใช้ ไม่เก็บฐานข้อมูลจริงไว้ใน Repository และ `.gitignore` จะตัด `node_modules`, local DB, backups, attachments และ `release/` ออก

## Architecture

ระบบยังคงหลัก Offline-first / Distributed Offline + Central Control โดยวางฐานสำหรับ Asset, Usage, Maintenance, Fuel/Cost, Person/Employee, Owner Registry, Site/Device, Audit, Backup/Restore และ HR Integration

## Production Note

v0.2.0 เป็น Functional MVP สำหรับทดสอบ Workflow งานจริง ยังต้องพัฒนา Local Authentication, Permission enforcement, document attachment storage, signed package exchange, security review และ workflow ของ Maintenance/Fuel ก่อน Production เต็มรูปแบบ
