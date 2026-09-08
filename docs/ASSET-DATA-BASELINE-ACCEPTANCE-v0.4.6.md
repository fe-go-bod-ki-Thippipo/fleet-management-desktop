# Asset Data Baseline Acceptance — v0.4.6

เอกสารนี้ใช้ตรวจรับโครงสร้างหลักของการจัดการข้อมูลทรัพย์สินก่อนล็อก Asset Module เป็น Baseline สำหรับการพัฒนาระบบส่วนอื่น

## หลักการรับรอง

- ต้องทดสอบบน Windows runtime จริง ทั้ง Portable หรือ Setup
- Static check/test/build ผ่านอย่างเดียวไม่ถือว่ารับรอง
- หากข้อ Critical/Data Integrity ไม่ผ่าน ห้ามรับรอง Baseline
- เมื่อผ่านทั้งหมด ให้บันทึกวันที่ ผู้ทดสอบ และผลรับรองท้ายเอกสาร

## REQ-01 Document Version Chain Integrity

- [ ] สร้างเอกสารใหม่ครั้งแรกได้ v1
- [ ] ต่ออายุ v1 ได้ v2 และไม่สร้าง v1 ซ้ำ
- [ ] ต่ออายุ v2 ได้ v3
- [ ] v1 มี `supersededById` ชี้ไป v2
- [ ] v2 มี `previousVersionId` ชี้ v1 และ `supersededById` ชี้ v3
- [ ] v3 มี `previousVersionId` ชี้ v2
- [ ] Current document มีเพียงหนึ่งฉบับ
- [ ] Record เก่าที่ Version ซ้ำไม่ถูกลบอัตโนมัติ และแสดงใน `Legacy / Unlinked`
- [ ] Version เก่าเป็น read-only

## REQ-02 Document Expense Save + Visibility

- [ ] แก้ค่าภาษีแล้ว Save และเปิดใหม่ค่ายังอยู่
- [ ] แก้เบี้ย พ.ร.บ. แล้ว Save และเปิดใหม่ค่ายังอยู่
- [ ] แก้เบี้ยประกันแล้ว Save และเปิดใหม่ค่ายังอยู่
- [ ] ตารางเอกสารรวมมีคอลัมน์ค่าใช้จ่าย
- [ ] ตารางเอกสารใน Asset Detail มีคอลัมน์ค่าใช้จ่าย
- [ ] Version เก่าแสดงค่าใช้จ่ายของ Version ตัวเอง ไม่ใช้ค่าของ Current version

## REQ-03 Renewal Bound to Source Document ID

- [ ] กดต่ออายุประกันภัย เปิดฟอร์มประกันภัย ไม่เปลี่ยนเป็น พ.ร.บ.
- [ ] กดต่ออายุ พ.ร.บ. เปิดฟอร์ม พ.ร.บ.
- [ ] `assetId` ของเอกสารใหม่ตรงกับต้นทาง
- [ ] `type` ของเอกสารใหม่ตรงกับต้นทาง
- [ ] New document ID ถูกสร้างใหม่ทุกครั้ง
- [ ] `previousVersionId` ของฉบับใหม่เท่ากับ Source Document ID
- [ ] ถ้า type ไม่ตรง ระบบต้องไม่ยอม Save

## REQ-04 Asset Photo Management

- [ ] หน้าเพิ่ม Asset เพิ่มรูปได้ก่อน Save
- [ ] หน้าแก้ไข Asset เพิ่มรูปได้
- [ ] หน้าแก้ไข Asset ลบรูปได้
- [ ] หน้าแก้ไข Asset ตั้งรูปหลักได้
- [ ] Asset Header เพิ่มรูปได้
- [ ] Asset Header ลบรูปหลักได้
- [ ] แท็บไฟล์/รูปยังจัดการรูปได้
- [ ] รูปทุกจุดใช้ข้อมูลชุดเดียวกันและสะท้อนตรงกันทันที
- [ ] เพิ่ม/ลบ/ตั้งรูปหลักมี Audit Log

## REQ-05 Owner Display Standard

- [ ] Dropdown เจ้าของแสดงชื่อบริษัท/บุคคล ไม่ใช่ OWxx อย่างเดียว
- [ ] Owner ID แสดงเป็นข้อมูลรองได้
- [ ] ระบบยังเก็บ `ownerId` เป็นค่าจริง
- [ ] Owner selector ทุกจุดใช้รูปแบบเดียวกัน
- [ ] Owner ที่ inactive แต่ยังถูกอ้างอิงต้องยังเห็นชื่อเดิมพร้อมสถานะ

## REQ-06 Asset Status Redesign

- [ ] Asset form แสดงสถานะเป็นปุ่มเลือก ไม่ใช่ Dropdown
- [ ] มี `ใช้งานอยู่`, `พักใช้งานชั่วคราว`, `งดใช้งาน`, `จำหน่ายแล้ว`
- [ ] ไม่มี `กำลังใช้งาน` ใน Asset Master Status
- [ ] `กำลังใช้งาน` ต้องมาจาก Usage Workflow เท่านั้น
- [ ] งดใช้งาน/จำหน่ายแล้วมี Confirm ก่อนเปลี่ยน
- [ ] การเปลี่ยนสถานะมี Audit Before → After

## REQ-07 Document Detail Exact Version Binding

- [ ] กด v1 แล้ว Detail แสดง v1 และข้อมูลของ record v1 เท่านั้น
- [ ] กด v2 แล้ว Detail แสดง v2 และข้อมูลของ record v2 เท่านั้น
- [ ] กด v3 แล้ว Detail แสดง v3 และข้อมูลของ record v3 เท่านั้น
- [ ] วันที่ เลขเอกสาร ค่าใช้จ่าย บริษัทประกัน และไฟล์แนบไม่ปะปนข้าม Version
- [ ] การ์ด ภาษี/พ.ร.บ./ประกันใน Asset Header เปิด Current/Latest Document ID ถูกต้อง
- [ ] Historical version แสดง `ฉบับเดิม · อ่านอย่างเดียว`

## Regression Check — ห้ามเสียของเดิม

- [ ] Asset Registry ยังมี 90 รายการ
- [ ] Search/Filter/Pagination ยังทำงาน
- [ ] Grouped Asset Form ยังเปิดและ Save ได้
- [ ] Asset Detail ทุกแท็บเดิมยังเปิดได้
- [ ] Document attachment preview ยังทำงาน
- [ ] Audit Trail v0.4.5 ยังทำงาน
- [ ] Global Search / Global Clear Filter ยังทำงาน
- [ ] ปิดเปิดโปรแกรมใหม่ข้อมูลยังอยู่

## ผลการรับรอง

- รุ่นที่ตรวจ: v0.4.6
- วันที่ตรวจ: ____________________
- ผู้ตรวจ: ____________________
- ผล: [ ] ผ่านและรับรองเป็น Asset Data Baseline  [ ] ไม่ผ่าน
- ข้อสังเกต/รายการแก้ไขเพิ่มเติม:

__________________________________________________________________

เมื่อทำเครื่องหมาย `ผ่านและรับรองเป็น Asset Data Baseline` แล้ว ให้ใช้ v0.4.6 เป็นโครงสร้างหลักขั้นต่ำของ Asset Management ในรุ่นถัดไป และห้ามลดความสามารถโดยไม่มี Requirement ใหม่ที่ได้รับการยืนยัน
