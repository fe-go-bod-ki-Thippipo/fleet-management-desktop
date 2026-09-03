# Fleet & Machinery Desktop v0.4.5 — Asset Review Requirements 1–6

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะ: ปรับแก้เฉพาะ Requirement 1–6 จากรอบตรวจ Asset v0.4.4 และคงส่วนอื่นทั้งหมดไว้ตามเดิม เพื่อทดสอบ runtime ก่อนล็อก Asset module

## Requirement 1–6 ใน v0.4.5

1. แก้ Asset Registry Search ให้พิมพ์ต่อเนื่องตามลำดับปกติและรักษา cursor/focus
2. Global Search แสดงหน้าผลลัพธ์หลายรายการก่อน ไม่เปิด Asset รายการแรกอัตโนมัติ
3. เพิ่มปุ่ม `ล้างตัวกรอง` ใน Global Filter Bar เพื่อรีเซ็ต Search / Company / Unit
4. การ์ด ภาษี / พ.ร.บ. / ประกัน ใน Asset Header คลิกไปเอกสารล่าสุดได้ และถ้ายังไม่มีสามารถเริ่มเพิ่มเอกสารประเภทนั้นได้ตาม Permission
5. เอกสารใน Asset Detail แบ่งกลุ่มตามประเภท เอกสารปัจจุบันอยู่บนสุด เอกสารเก่า/หมดอายุมีสถานะชัด และ Version เก่าเป็น read-only
6. ปรับหน้า `ประวัติ/Audit` เป็น Audit Trail ใหม่ มี Summary, Search/Filter, Event chips, Timeline, Detail panel, Before/After และ Pagination

## ขอบเขตการเปลี่ยนแปลง

รอบ v0.4.5 นี้ไม่เปลี่ยน Workflow หรือโมดูลอื่นที่ไม่เกี่ยวข้องกับ Requirement 1–6 ข้างต้น และยังคง v0.13.4 parity baseline เดิม

## Build / runtime acceptance

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์ที่คาดหวัง:

```text
Fleet-Machinery-Desktop-0.4.5-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.5-Portable-x64.exe
fleet-desktop-v0.4.5-windows
```

หมายเหตุ: การผ่าน static check/test/build ไม่เท่ากับผ่านการทดสอบ click behavior บน Windows จริง จึงต้องตรวจ runtime ก่อนล็อก Asset module.
