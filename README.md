# Fleet & Machinery Desktop v0.4.8 — Document Core Consolidation Review

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะ: รุ่นตรวจรับ Asset/Data + Document Baseline หลังรวม Document Logic ให้มี authoritative core เดียวสำหรับพฤติกรรมเอกสารที่ผู้ใช้ตรวจรับ

## งานแก้/เพิ่มที่ต้องผ่านใน v0.4.8

- REQ-01A ป้องกัน Version ซ้ำใน chain เดียวกัน และไม่ให้ Add Document สร้าง v1 ซ้ำเมื่อมี Asset + Document Type เดิมอยู่แล้ว
- REQ-01B Version Chain ใช้ `previousVersionId / supersededById` และ Detail แสดง Previous/Next ตาม Document ID จริงเท่านั้น; Legacy / Unlinked แยกจาก chain ปกติ
- REQ-05 Owner Display UX แสดงชื่อเจ้าของและข้อมูลประกอบในบรรทัดเดียว
- BUG-v046-01 Attachment Viewer เปิด PDF/รูปใน viewer ภายในโปรแกรม และ Historical Version เปิด attachment ของ Document ID ที่เลือกจริง
- REQ-08 Document Registry Layout ตามแบบล่าสุด: Category Cards, Search/Status/Expiry/Date filters, Reset, Export, table และ pagination
- REQ-09 แสดงจำนวนวันคงเหลือ/หมดอายุ เช่น `เหลือ 7 วัน` หรือ `หมดอายุแล้ว 5 วัน`
- REQ-10 ลบเอกสารเฉพาะ Admin, มี Confirm, ใช้ Soft Delete และบันทึก Audit Log

## Regression Lock ที่ต้องยังผ่าน

- REQ-02 ค่าใช้จ่ายเอกสาร บันทึกและแสดงในตาราง
- REQ-03 Renewal ผูก Source Document ID และล็อก Asset/Type
- REQ-04 Photo Management เพิ่ม/ลบ/ตั้งรูปหลัก
- REQ-06 Asset Status selector
- REQ-07 Exact Version Detail ต้องแสดงข้อมูลของ Document ID ที่เลือกจริง

## Implementation rule

`src/renderer/app/document-core-v048.js` ถูกโหลดหลัง legacy document/asset override ทุกตัว และก่อน `version-final.js` เพื่อให้เป็น authoritative implementation ของ `documentPage`, `renderDocTable`, `assetDocumentDetail`, `documentForm`, `renewDocument` และ `deleteDocumentAdmin` ในรุ่นตรวจรับนี้

## Runtime acceptance

ใช้ `docs/ASSET-DATA-BASELINE-ACCEPTANCE-v0.4.8.md` ไล่ตรวจจริงบน Windows ก่อน Merge เข้า `main`.

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์ที่คาดหวัง:

```text
Fleet-Machinery-Desktop-0.4.8-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.8-Portable-x64.exe
fleet-desktop-v0.4.8-windows
```

หมายเหตุ: static check/test/build ไม่เท่ากับ runtime acceptance จนกว่าจะตรวจ checklist จริงครบทุกข้อ
