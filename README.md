# Fleet & Machinery Desktop v0.4.4 — Asset Requirements Complete

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะ: ปิด Requirement ที่ค้างในส่วนข้อมูลทรัพย์สินเพื่อเข้าสู่ runtime acceptance ก่อนย้ายไปโมดูลถัดไป

## Asset requirements ที่รวมใน v0.4.4

- Asset Registry: Pagination 10/20/50, Search/Status Filter, Edit ตาม Permission, คลิกทั้งแถวเพื่อเปิด Asset Detail และปุ่ม Action ไม่ทำให้เปิดแถวซ้ำ
- Asset Registry มี `ล้างตัวกรอง` และรีเซ็ตกลับหน้า 1 โดย Search/Filter state ยังอยู่ระหว่างเปิดรายละเอียดและกลับรายการ
- Asset Detail: Grouped Asset Form, ข้อมูลพื้นฐานแยกจากเอกสารสำคัญ, ไม่มี Timeline ซ้ำในข้อมูลทั่วไป
- Header ใช้ `ข้อมูลพื้นฐาน xx%` และ `เอกสารสำคัญ x/3 รายการ` แยกความหมายชัดเจน
- Audit เป็น History Center จุดเดียว พร้อม Search / Event / Date / Clear Filter / Before-After
- Document ที่ผูกกับ Asset: แสดงชื่อ/ทะเบียนโดยไม่แสดง Asset Code ภายใน, คลิกแถวดูรายละเอียด, Version History, Edit/Renew
- Attachment: ชื่อไฟล์คลิกได้ รองรับ Preview PDF และรูปภาพ รวม canonical attachment และ legacy attachmentData/attachmentName
- Renewal ใช้ immutable version chain และเลข Version ใหม่
- กำหนดมาตรฐานกลาง `Global Interactive Table Standard`, `Global Filter Standard`, `Grouped Form Standard` สำหรับนำไปใช้กับโมดูลถัดไป

## Build / runtime acceptance

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์:

```text
Fleet-Machinery-Desktop-0.4.4-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.4-Portable-x64.exe
fleet-desktop-v0.4.4-windows
```

หมายเหตุ: การผ่าน static check/test/build ไม่เท่ากับผ่านการทดสอบ click behavior บน Windows จริง จึงต้องตรวจ runtime รอบนี้ก่อนล็อก Asset module.
