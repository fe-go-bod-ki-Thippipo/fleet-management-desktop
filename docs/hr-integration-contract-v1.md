# Fleet Desktop ↔ HR Integration Contract v1

สถานะ: Approved architecture extension
Fleet baseline: Fleet Management Prototype v0.13.4
Desktop target: Fleet Desktop v0.1.x
Integration mode: Offline-first Package Exchange; API-ready in future

## 1. หลักการ
- HR เป็น Source of Truth สำหรับข้อมูลตัวตนและสถานะการจ้างของพนักงาน
- Fleet ไม่สร้าง Employee Master ซ้ำเพื่อแข่งขันกับ HR
- Fleet มี Person Reference ของตนเองเพื่อใช้ Foreign Key ภายในระบบ
- Fleet เป็น Source of Truth สำหรับบทบาท/สิทธิ์/ความรับผิดชอบเฉพาะงาน Fleet
- ห้ามให้การ Import จาก HR ทับข้อมูล Fleet-specific โดยอัตโนมัติ

## 2. HR-authoritative fields
Fleet รับจาก HR และถือเป็น Read-only เมื่อ record เชื่อม HR แล้ว:
- employee_id
- first_name / last_name / display name
- company / company_ref
- operating unit / site_ref
- department / department_ref
- position
- work email / phone ตามนโยบาย
- employment_status
- employment_start_date / employment_end_date
- hr_employee_ref

## 3. Fleet-authoritative fields
- operational roles เช่น DRIVER, ASSET_CUSTODIAN, REQUESTER, APPROVER, FLEET_OFFICER
- Fleet User Account
- login email สำหรับ Fleet
- System Role / Permission / Data Scope
- Device/Site authorization
- Asset responsibility
- Driver/Operator assignment
- Owner Registry link สำหรับรถส่วนตัวพนักงาน
- Fleet audit/history

## 4. Identity Mapping
ใช้กุญแจหลัก:
- HR: employee_id / hr_employee_ref
- Fleet: person.id (UUID)
- Fleet: person.person_code สำหรับแสดงผล

ห้าม Match ด้วยชื่อ-นามสกุลเพียงอย่างเดียว

## 5. Offline HR Package
Package type: HR_EMPLOYEE_MASTER

Manifest:
- package_id
- package_type
- source_system
- source_site
- issued_at
- schema_version
- contract_version
- record_count
- payload_hash
- digital_signature

Payload:
- employees[]
- organization_refs[] optional
- changes_since optional
- status changes/tombstones optional

## 6. Import Rules
1. ตรวจ Package/Schema/Contract Version
2. Validate required fields
3. Match ด้วย hr_employee_ref/employee_id
4. ถ้าไม่พบ → สร้าง Fleet Person Reference ใหม่
5. ถ้าพบ → Update เฉพาะ HR-authoritative fields
6. ห้ามลบ Fleet Roles/User/Permissions/Assignments
7. พนักงานลาออก → เปลี่ยน employment_status; ไม่ Hard Delete Person
8. Fleet User Account ของผู้ลาออก → Review Queue หรือ suspend ตาม policy
9. บันทึก Audit Log ทุก Import
10. สร้าง Import Summary และ Error/Conflict list

## 7. Employee Termination / Transfer
### ลาออก
- Person ยังคงอยู่เพื่อรักษาประวัติ
- ห้ามลบ Asset/Document/Audit references
- User Account → PENDING_SUSPEND หรือ SUSPENDED ตาม policy
- Active Driver/Approver roles → review/expire
- Asset responsibility → แจ้ง reassignment

### ย้ายหน่วยงาน
- Update HR-authoritative org fields
- ตรวจ Data Scope และ Site assignment
- ไม่เปลี่ยน Fleet Role อัตโนมัติหากไม่มี policy
- สร้าง Review item ถ้าสิทธิ์เดิมขัดกับหน่วยงานใหม่

## 8. Private Employee Vehicle
Owner Registry:
- owner_type = EMPLOYEE
- reference_type = PERSON
- reference_id = Fleet person.id

เมื่อพนักงาน deactivate/terminated:
- Owner Registry และ Asset ownership history ต้องไม่ถูกลบ
- สิทธิ์เบิกน้ำมัน/ค่าซ่อมสามารถสิ้นสุดตาม policy
- รถที่ยัง Active ต้องเข้า Review Queue

## 9. Organization Mapping
ควรมี mapping table:
- HR company_id ↔ Fleet company_id
- HR department_id ↔ Fleet department_id
- HR site/unit_id ↔ Fleet site/operating_unit_id

ห้าม Mapping จากชื่ออย่างเดียวใน production

## 10. Future API Contract
เมื่อ HR Online สามารถใช้ API เช่น employee changes และ organization endpoints หรือ event/webhook ตามความพร้อม โดย Fleet Import Service ใช้ normalized payload เดียวกับ Offline Package เพื่อเปลี่ยน transport โดยไม่เปลี่ยน Domain Model

## 11. Security / Privacy
- ส่งเฉพาะข้อมูลพนักงานที่ Fleet จำเป็นต้องใช้
- ไม่ส่ง salary, bank account, health data เข้าสู่ Fleet
- Package ควรเข้ารหัสเมื่อมีข้อมูลบุคคลจริง
- Package ควรมี signature/checksum
- Import/Export ต้องมี Audit
- Data Scope ต้องบังคับใช้กับข้อมูลบุคคลด้วย

## 12. Integration Tables
- hr_integration_source
- hr_person_mapping
- organization_mapping
- integration_import_log
- integration_review_queue

## 13. Fleet UI
Settings → การเชื่อมต่อ HR:
- สถานะแหล่งข้อมูล HR
- Contract Version
- Import Employee Package
- Last Import
- จำนวนเพิ่ม/แก้ไข/ข้าม/ผิดพลาด
- Organization Mapping
- Review Queue
- Import History

Person Profile:
- badge เชื่อมจาก HR
- HR Employee ID
- HR-authoritative fields Read-only
- Fleet Role/Permission แก้จาก Fleet ได้

## 14. Initial Scope
Foundation ก่อน:
- schema/mapping tables
- HR package contract
- package validator
- employee upsert rules
- organization mapping
- import audit
- review queue structure

ยังไม่จำเป็นต้องทำ Real-time API, Payroll, Attendance หรือ Salary/Benefit data

## 15. Locked Principle
HR owns Employee Identity. Fleet owns Fleet Authorization and Operations. Integration must preserve history and never silently overwrite Fleet-specific data.
