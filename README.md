# Fleet & Machinery Desktop v0.3.0

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline สำหรับบริหารรถยนต์และเครื่องจักร ใช้ Electron + SQLite โดยกำหนดให้ความสามารถพื้นฐานของสาย Desktop **ต้องไม่น้อยกว่า Fleet Management Prototype v0.13.4** ในส่วน Asset / Documents / Owner / Person / Master / Audit ก่อนต่อยอดโมดูลเสริม

## v0.3.0 — Desktop Parity Baseline

ฟังก์ชันหลักที่เปิดใช้งาน:

- Dashboard สรุป Asset, เอกสาร, เอกสารใกล้หมดอายุ, Usage และ Maintenance foundation
- Asset CRUD + Search
- Asset Detail / Profile พร้อมแท็บข้อมูลทั่วไป, เอกสาร, Meter History และ Audit
- Company / Site / Owner Registry
- Person / Employee Master
- User Account แยกจาก Person พร้อม System Role / Data Scope / Auth Provider foundation
- Master Data: Vehicle Type, Brand, Model, Color, Body Type, Fuel Type, Document Type
- Asset Documents แบบรวมทั้งระบบและราย Asset
- Filter เอกสารหมดอายุ / ใกล้หมดอายุ
- Document metadata สำหรับภาษี / พ.ร.บ. / ประกันภัย
- Document attachment path และเปิดไฟล์จาก Desktop
- Document Renewal แบบสร้าง Version ใหม่และเก็บ Version เดิม
- Audit Log
- Backup / Restore SQLite
- Meter History รองรับ KM / HOUR
- Usage Workflow แบบ Offline: บันทึกคำขอ → ตรวจเวลาซ้อน → พิมพ์ใบขอ → บันทึกผลอนุมัติ → เลขไมล์/เชื้อเพลิงก่อนใช้ → คืนรถ → เลขไมล์/เชื้อเพลิงหลังใช้ → ปิดงาน

## Foundation ที่วางไว้และพัฒนาต่อโดยไม่รื้อ Schema

- Maintenance / Repair / Work Order
- PM Plan / Schedule
- Vendor / Workshop
- Fuel Transaction
- Expense Ledger / Cost
- Incident
- HR Integration / Employee Package
- Distributed Offline + Central Control / signed package exchange

## Windows Build

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์:

```text
Fleet-Machinery-Desktop-0.3.0-Setup-x64.exe
Fleet-Machinery-Desktop-0.3.0-Portable-x64.exe
```

## GitHub Actions

เพื่อไม่ให้เกิด Build จำนวนมากทุกครั้งที่แก้เอกสารหรือ commit ย่อย Workflow v0.3.0 จะ Build เมื่อ:

1. ไปที่ **Actions → Build Windows EXE → Run workflow** แล้วสั่งเอง
2. Push Tag รูปแบบ `v*` เช่น `v0.3.0`

## Data / Architecture

- Offline-first, SQLite ต่อเครื่อง/Site
- App Data เก็บฐานข้อมูลและ attachments
- Soft Delete + Audit + Schema Migration
- Employee Identity วางให้ HR เป็น Source of Truth ในอนาคต ส่วน Fleet ดูแล Fleet Role / Permission / Data Scope / Assignment
- Owner Registry เป็น reference layer กลางสำหรับกรรมสิทธิ์ Asset
- Asset / Usage / Maintenance / Fuel-Cost เป็น 4 เสาหลักของ Fleet architecture

## ข้อจำกัดปัจจุบัน

v0.3.0 เป็น Desktop parity / operational foundation สำหรับทดสอบงานจริง แต่ยังไม่ใช่ Production release เต็มรูปแบบ โดยยังต้องพัฒนา Local Authentication enforcement, Permission enforcement, attachment/photo gallery เต็มรูปแบบ, PM/Maintenance workflow, Fuel/Cost workflow, signed exchange packages และ security review ต่อไป
