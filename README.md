# Fleet & Machinery Desktop v0.4.0 — Parity Recovery

Fleet & Machinery Desktop เป็นโปรแกรม Desktop Offline (Electron + SQLite) สำหรับระบบทะเบียนรถยนต์และเครื่องจักร โดย **Fleet Web v0.13.4 คือ Functional Source of Truth / Minimum Baseline**

> สถานะปัจจุบัน: **ยังไม่ใช่ Desktop Parity Baseline**
>
> v0.4.0 เป็น Parity Recovery Build สำหรับย้ายและทดสอบความสามารถจาก v0.13.4 บน Desktop เท่านั้น การ Build ผ่านหรือสร้าง `.exe` สำเร็จ **ไม่ได้แปลว่า Feature Parity ครบ**

## Feature Parity Matrix

ใช้ `docs/FEATURE-PARITY-MATRIX-v0.13.4.md` เป็น Checklist หลักในการพัฒนาและ Acceptance Test ต่อจากนี้

กฎการพัฒนา:

1. ทุก Requirement เดิมของ v0.13.4 เป็น MUST จนกว่าจะระบุเป็นอย่างอื่นอย่างชัดเจน
2. ห้ามลดความสามารถของ Asset / Documents / Owner / Person / Master / Permission / Data Scope / Calendar / Reports / Audit เพื่อแลกกับการทำ Desktop ให้ง่ายขึ้น
3. ฟังก์ชันที่มีเพียงหน้าจอหรือชื่อฟังก์ชัน แต่ยังไม่ครบ Workflow/Data relationship/Permission/History ให้ถือเป็น `PARTIAL`
4. Release จะเรียกว่า `Desktop Parity Baseline` ได้ต่อเมื่อ Matrix ทุก MUST row เป็น `PASS`
5. หลัง Parity ครบแล้วจึงค่อยเพิ่ม Desktop-specific features ต่อโดยไม่ทำให้ Baseline ถอยหลัง

## สิ่งที่มีใน v0.4.0 Recovery Build

- Electron Offline + SQLite persistence
- Asset Seed 90 รายการ
- Asset Registry / Asset Profile / Edit
- Documents / Renewal foundation
- Photo foundation
- Owner Registry foundation
- Person/User foundation
- Master Data foundation
- Usage workflow foundation
- Maintenance / PM / Incident foundation
- Fuel / Expense / Reports foundation
- Audit foundation
- SQLite Backup / Restore
- Windows NSIS Installer + Portable build configuration

รายการด้านบน **ไม่ใช่คำยืนยันว่าเทียบเท่า v0.13.4 ครบแล้ว** ให้ยึด Feature Parity Matrix เป็นหลัก

## Build test EXE

```bash
npm install
npm run check
npm test
npm run build:win
```

ผลลัพธ์ที่คาดหวัง:

```text
Fleet-Machinery-Desktop-0.4.0-Setup-x64.exe
Fleet-Machinery-Desktop-0.4.0-Portable-x64.exe
```

GitHub Actions ตั้งให้ Build เมื่อ Run workflow เองหรือ Push Tag `v*` เท่านั้น
