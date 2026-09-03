# Fleet & Machinery Desktop v0.4.6 — Asset Data Baseline Review

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะ: รุ่นสำหรับตรวจรับโครงสร้างหลักของการจัดการข้อมูลทรัพย์สิน ก่อนล็อก Asset Module และไปพัฒนาระบบอื่น

## Requirement 1–7 ใน v0.4.6

1. Document Version Chain ใช้ `previousVersionId / supersededById` เป็นความสัมพันธ์หลัก, ป้องกันเลข Version ใหม่ซ้ำ และแยก Legacy / Unlinked ออกจาก chain ปกติ
2. แก้การบันทึกค่าภาษี/เบี้ย พ.ร.บ./เบี้ยประกัน และแสดงค่าใช้จ่ายในตารางเอกสารทุกจุด
3. Renewal ผูกกับ Source Document ID โดยตรงและตรวจชนิดเอกสารก่อนบันทึก
4. Asset Photo Management เพิ่ม/ลบ/ตั้งรูปหลักได้จากฟอร์ม Asset และจุดแสดงรูปหลัก พร้อมใช้ photo record ชุดเดียวกัน
5. Owner selector แสดงชื่อที่ผู้ใช้เข้าใจ พร้อม Owner ID เป็นข้อมูลรอง โดยระบบยังเก็บ `ownerId`
6. Asset Status แยกสถานะทรัพย์สินระยะยาวออกจาก `กำลังใช้งาน` ของ Usage Workflow และเปลี่ยนเป็นปุ่มสถานะ
7. Document Detail ผูกกับ Document ID/Version ที่ผู้ใช้เลือก ทำให้ข้อมูล v1/v2/v3 ไม่ปะปนกัน

## Runtime acceptance

ใช้ไฟล์ `docs/ASSET-DATA-BASELINE-ACCEPTANCE-v0.4.6.md` สำหรับไล่ตรวจและลงผลรับรอง หากผ่านครบจึงให้ v0.4.6 เป็น Asset Data Baseline สำหรับการพัฒนาส่วนอื่นต่อ

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์ที่คาดหวัง:

```text
Fleet-Machinery-Desktop-0.4.6-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.6-Portable-x64.exe
fleet-desktop-v0.4.6-windows
```

หมายเหตุ: static check/test/build ไม่เท่ากับ runtime acceptance บน Windows จนกว่าจะไล่ตรวจ checklist จริงครบทุกข้อ
