# Fleet Desktop Architecture & Data Blueprint v1

## 1. เป้าหมาย
Fleet & Machinery Desktop เป็นระบบ Desktop Offline-first สำหรับบริหารรถยนต์และเครื่องจักร โดยแยกฐานข้อมูลของแต่ละ Site และเตรียมสถาปัตยกรรมให้เชื่อม Central/HR/API ได้ในอนาคตโดยไม่ต้องรื้อ Domain Model ใหม่

## 2. Architecture หลัก
- Desktop Runtime: Electron
- Local Database: SQLite
- Attachments: App Data directory
- Schema Migration: versioned SQL migrations
- Backup/Restore: DB + attachments
- Offline Exchange: signed packages
- Future Central API: เปลี่ยน transport ได้โดยไม่เปลี่ยน business model

## 3. Distributed Offline + Central Control
แต่ละ Site ทำงานได้โดยไม่ต้องเชื่อมอินเทอร์เน็ตถาวร แต่ Central เป็นผู้กำหนด Site, Device, User, Role, Permission, Data Scope และ Master Policy

ข้อมูลไม่ควรถูก merge ด้วยการคัดลอก SQLite ทั้งไฟล์ระหว่าง Site แต่แลกเปลี่ยนผ่าน package ที่มี version, source, checksum และ signature

## 4. Desktop Identity
ทุก record ที่ต้อง sync ควรมี UUID ภายใน พร้อม business/display code สำหรับมนุษย์อ่าน

Metadata มาตรฐาน:
- id
- code
- site_id
- created_at / created_by / created_device_id
- updated_at / updated_by / updated_device_id
- version_no
- sync_status
- deleted_at
- source_system

ใช้ Soft Delete กับข้อมูลที่ต้อง sync หรือเก็บประวัติ

## 5. Data Authority
Central Authority:
- Company
- Site
- Device
- System Role
- Permission
- Data Scope
- Core Master Data
- Owner Registry policy
- User Account policy

HR/Central Authority:
- Person/Employee identity
- Organization fields
- Employment status

Fleet Authority:
- Asset/Vehicle/Machinery Master
- Fleet operational roles
- Asset responsibility
- Usage
- Documents
- Maintenance/PM
- Fuel/Cost
- Incident
- Audit

## 6. Core Domains
### Asset
Asset เป็นศูนย์กลางข้อมูลรถยนต์และเครื่องจักร รองรับ company/site/owner/responsible person/status/meter/documents

### Owner Registry
เป็น reference/role layer สำหรับ owner type: company, employee, person, external, other/pending review โดยอ้าง Company หรือ Person และเก็บ policy การเบิกค่าใช้จ่าย

### Person / Employee / User
Person/Employee Master เป็นตัวตนหลัก ส่วน User Account เป็นบัญชีเข้าโปรแกรม ไม่ใช่พนักงานทุกคนต้องมี User Account

Fleet operational roles อาจประกอบด้วย driver, asset custodian, requester, approver, fleet officer, asset owner และ system user

### Documents
รองรับเอกสาร Asset แบบ versioned เช่น ภาษี, พ.ร.บ., ประกันภัย, ตรวจสภาพ, เอกสารอื่น พร้อม expiry และ attachment

## 7. Usage Architecture
Offline รุ่นแรกใช้ Admin เป็นผู้ใช้ระบบหลัก

Workflow:
พนักงานแจ้งความต้องการ → Admin บันทึกคำขอ → ระบบพิมพ์ใบขอใช้รถ/เครื่องจักร → นำไปขออนุมัติและตรวจข้อมูลก่อนใช้งาน → Admin บันทึกผลอนุมัติ → จัดสรรรถ/Operator → ใช้งาน → ผู้ใช้กรอกข้อมูลคืนในเอกสาร → Admin บันทึกคืนและปิดรายการ

Usage Data Model ต้องรองรับ:
- Request
- Approval / Pre-Use
- Assignment
- Checkout / Usage Session
- Return
- Meter Reading
- Fuel Link
- Incident Link
- Cost Link
- Audit / Status History

ต้องแยก requested_asset_id ออกจาก assigned_asset_id และไม่บังคับทุก Usage ให้มี Request เพื่อรองรับรถประจำหน่วยงาน รถส่วนตัวพนักงาน เครื่องจักร และงานฉุกเฉิน

ข้อมูลก่อนใช้:
- asset
- driver/operator
- meter_before + unit
- fuel_before
- condition_before
- approved_by / approved_at
- approval_status
- approval document reference

ข้อมูลคืน:
- returned_at
- meter_after
- fuel_after
- condition_after
- damage/incident
- return_note
- returned_by
- received_by

ระบบคำนวณระยะทาง/ชั่วโมงจาก meter_after - meter_before

## 8. Asset Availability Checks
ก่อนจัดสรรควรตรวจ:
- ช่วงเวลาซ้ำ
- อยู่ระหว่างซ่อม
- เอกสารสำคัญหมดอายุ
- Asset status พร้อมใช้
- driver/operator qualification ตาม policy

ช่วงแรกสามารถ Warning ก่อนแทนการ Block

## 9. Maintenance / PM Foundation
วาง Schema ตั้งแต่ต้น แม้ UI เต็มจะพัฒนาในรุ่นถัดไป

Maintenance Work Order:
แจ้งปัญหา → เปิดงานซ่อม → diagnosis → maintenance items/parts → vendor/workshop → expense → ปิดงาน

PM Plan รองรับ trigger ตาม date / km / hour และ next due date/meter

## 10. Meter History
Meter Reading เป็นข้อมูลกลาง ใช้ร่วมกันโดย Usage, Maintenance, PM และ Fuel

รองรับ KM และ HOUR

## 11. Fuel & Cost Foundation
Fuel Transaction อ้าง Asset และ optional Usage Request พร้อม meter, quantity, unit price, vendor และ receipt

Expense Ledger เป็น ledger กลางสำหรับ:
- fuel
- repair
- maintenance
- tax
- insurance
- document cost
- reimbursement
- other asset expenses

แต่ละ module อ้าง Expense Ledger แทนการสร้างระบบค่าใช้จ่ายแยกซ้ำ

## 12. Incident
Incident อ้าง Asset และ Usage ได้ รองรับประเภทเหตุการณ์ ความรุนแรง สถานะ รายละเอียด และประวัติ

## 13. HR Integration
HR เป็น Source of Truth สำหรับ employee identity / employment / organization

Fleet เป็น Source of Truth สำหรับ Fleet Role, User Account, Permission, Data Scope, Asset responsibility และ Fleet operations

Initial transport: HR Employee Master Package → Fleet Import
Future transport: API โดยใช้ normalized contract เดิม

## 14. Offline Package Types
Access Package — Central → Site
- Site identity
- Device authorization
- User/Role/Permission/Data Scope
- validity/expiry
- version/signature

Master Package — Central → Site
- Company/Site
- Master Data
- Owner Registry
- Person/Employee references
- version manifest/signature

Data Package — Site → Central
- changed records
- audit events
- tombstones
- source site/device
- sequence/schema version
- checksum/signature

## 15. Conflict Rules
1. Central-authority field → Central wins
2. Site-authority field → owning Site wins
3. Concurrent shared field edit → Conflict Review Queue
4. ห้าม silent overwrite
5. Audit เก็บ before/after

## 16. Security
- Local Authentication foundation
- Role / Permission / Data Scope แยกกัน
- Offline DB ต้องมีเฉพาะข้อมูลตาม scope เมื่อเข้าสู่ production
- Signed exchange packages
- Encrypted backup/package เมื่อมีข้อมูลจริง
- Audit ทุก transaction สำคัญ

## 17. Desktop v0.1.x Scope
เปิด foundation สำหรับ:
- Asset Management
- Owner Registry
- Person/Employee + User foundation
- Asset Documents
- Site/Device
- Audit
- Backup
- Usage Request skeleton
- Meter
- Maintenance/PM schema
- Fuel/Expense schema
- Incident schema
- HR integration schema

ยังไม่เปิด workflow เต็มของ Maintenance/Fuel/Security/Exchange

## 18. Recommended Project Structure
```text
fleet-desktop/
  src/
    main/
    preload/
    renderer/
    services/
  database/
    migrations/
  docs/
  build/
  scripts/
  tests/
```

## 19. Development Roadmap
- D0 Architecture Lock
- D1 Desktop Shell: Electron + SQLite + App Data + Migration
- D2 Data Foundation: Site/Device, Person/User, Owner Registry, Asset
- D3 Usage & Documents
- D4 Maintenance/PM
- D5 Fuel/Cost/Incident
- D6 Security + Offline Exchange
- D7 Installer/Upgrade/Recovery/Production hardening

## 20. Locked Principle
วางฐานรากของ Asset + Usage + Maintenance + Fuel/Cost ตั้งแต่ต้น แต่ทยอยเปิด UI/Workflow ตาม version เพื่อไม่ให้ต้องรื้อ schema และ relationship ภายหลัง
