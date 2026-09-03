# Asset/Data + Document Baseline Acceptance — v0.4.8

ใช้สำหรับตรวจจริงบน Windows ก่อน Merge เข้า `main`.

| ID | รายการตรวจ | เกณฑ์ผ่าน | ผล |
|---|---|---|---|
| REQ-01A | Version ซ้ำ | Asset + ประเภทเดียวกันใน chain เดียวกันไม่มีเลข Version ซ้ำ; Add Document ซ้ำต้องถูกบล็อกและให้ใช้ต่ออายุ | ☐ |
| REQ-01B | Version Chain | ใช้ `previousVersionId / supersededById`; v1 แสดง Next, v2 แสดง Previous/Next, latest แสดง Previous; Legacy/Unlinked ไม่ปน chain | ☐ |
| REQ-02 | Expense | ค่าใช้จ่ายบันทึกได้และแสดงใน Document Registry/Detail | ☐ |
| REQ-03 | Renewal Source | ต่ออายุจาก Document ID ที่กดจริง; Asset/Type ถูกล็อก; source/latest ถูกต้อง | ☐ |
| REQ-04 | Photo Management | เพิ่ม/ลบ/ตั้งรูปหลักได้จาก Asset UI และ Audit ยังทำงาน | ☐ |
| REQ-05 | Owner Display | ชื่อเจ้าของ + ข้อมูลประกอบอยู่บรรทัดเดียวและอ่านเข้าใจ | ☐ |
| REQ-06 | Asset Status | selector สถานะยังทำงานและบันทึก Audit | ☐ |
| REQ-07 | Exact Version Detail | เปิด v1/v2/v3 แล้วทุก field เป็นข้อมูลของ Document ID ที่เลือกจริง | ☐ |
| BUG-v046-01 | Attachment Viewer | `เปิดไฟล์` เปิด PDF/รูปได้ใน viewer; historical version เปิดไฟล์ของ version นั้นจริง | ☐ |
| REQ-08 | Document Registry Layout | Category cards + filters + reset + export + table + pagination ตาม layout ล่าสุด | ☐ |
| REQ-09 | Expiry Days | แสดง `เหลือ N วัน`, `หมดอายุวันนี้`, `หมดอายุแล้ว N วัน` ถูกต้อง | ☐ |
| REQ-10 | Admin Delete | เฉพาะ Admin เห็น/ใช้ลบ; confirm; soft delete; audit; non-admin ลบไม่ได้ | ☐ |

## Scenario บังคับ

1. เลือกเอกสารปัจจุบันหนึ่งรายการ → ต่ออายุ 2 รอบ → ต้องได้ `v1 → v2 → v3` โดยไม่มี Version ซ้ำใน chain.
2. เปิด v2 → Previous ต้องไป v1 และ Next ต้องไป v3.
3. เปิด v1/v2/v3 ทีละรายการ → `เปิดไฟล์` ต้องเปิด attachment ของ Document ID นั้น ไม่ใช่ไฟล์ของ latest.
4. ทดลอง Add Document ประเภทเดิมให้ Asset เดิม → ระบบต้องไม่สร้าง v1 ซ้ำ และแจ้งให้ใช้ `ต่ออายุ`.
5. Login/เลือกบทบาท non-admin → ต้องไม่สามารถลบเอกสารได้.
6. Admin ลบ Legacy/Unlinked ที่เป็น Version ซ้ำ → รายการหายจาก active UI แต่ Audit ต้องมี record การลบ และ chain หลักต้องไม่เสีย.
7. ตรวจ REQ-02/03/04/06/07 ซ้ำเพื่อยืนยันว่าไม่มี regression.

## ผลรับรอง

- วันที่ตรวจ: __________
- ผู้ตรวจ: __________
- ผล: ☐ ผ่านทั้งหมด ☐ ไม่ผ่าน
- Issue/หมายเหตุ: ______________________________________
- อนุมัติให้เป็น Asset/Data + Document Baseline: ☐ ใช่ ☐ ไม่ใช่
