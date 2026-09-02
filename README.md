# Fleet & Machinery Desktop v0.1.2

Fleet & Machinery Desktop เป็นฐานโปรแกรม Desktop Offline สำหรับบริหารรถยนต์และเครื่องจักร โดยยึด Data/Architecture จาก Fleet Management Prototype v0.13.4 และสาย Desktop v0.1.x

## จุดสำคัญของ v0.1.2

- Electron + SQLite (better-sqlite3)
- Renderer entry ที่ `index.html`
- Local App Data + Schema Migration + Backup
- Asset / Owner / Person / User foundation
- Usage Request foundation
- Meter Reading กลาง รองรับ KM/HOUR
- Maintenance / PM / Fuel / Expense / Incident schema foundation
- HR Integration foundation
- Windows build configuration ด้วย electron-builder
- Windows Installer (NSIS) + Portable EXE target
- App icon สำหรับ Windows
- Batch script สำหรับ Build บน Windows
- GitHub Actions workflow สำหรับ Build `.exe`

> v0.1.2 ยังเป็น Development Foundation. Maintenance, Fuel/Cost และ Usage Workflow เต็มจะพัฒนาต่อในรุ่นถัดไป

## ทดลองรันบน Windows

ต้องติดตั้ง Node.js LTS ก่อน แล้วเปิด Command Prompt/Terminal ที่โฟลเดอร์โปรเจกต์:

```bash
npm install
npm start
```

หรือดับเบิลคลิก:

```text
scripts/run-development.bat
```

## สร้างไฟล์ Windows `.exe`

วิธีง่ายสุดบน Windows คือดับเบิลคลิก:

```text
scripts/build-windows.bat
```

Script จะทำตามลำดับ:

1. ตรวจ Node.js
2. `npm install`
3. `npm run check`
4. `npm test`
5. `npm run build:win`
6. เปิดโฟลเดอร์ `release/`

หรือใช้ Terminal:

```bash
npm install
npm run build:win
```

ไฟล์ที่ได้จะอยู่ใน:

```text
release/
```

โดย target หลักคือ:

```text
Fleet-Machinery-Desktop-0.1.2-x64-nsis.exe
Fleet-Machinery-Desktop-0.1.2-Portable-x64.exe
```

> ชื่อจริงอาจแตกต่างเล็กน้อยตาม electron-builder แต่จะอยู่ใน `release/` เสมอ

## Build แยกประเภท

Installer:

```bash
npm run build:installer
```

Portable:

```bash
npm run build:portable
```

## Build ผ่าน GitHub Actions

ไฟล์ workflow อยู่ที่:

```text
.github/workflows/build-windows.yml
```

หลัง Push ขึ้น GitHub สามารถเปิดแท็บ **Actions → Build Windows EXE → Run workflow** แล้วดาวน์โหลด Artifact ที่ GitHub สร้างให้ได้

หรือสร้าง Tag เช่น:

```bash
git tag v0.1.2
git push origin v0.1.2
```

Workflow จะเริ่ม Build อัตโนมัติ

## โครงสร้าง Repository

```text
fleet-desktop-v0.1.2/
├─ .github/workflows/build-windows.yml
├─ build/
│  ├─ icon.ico
│  └─ icon.png
├─ database/migrations/
├─ docs/
├─ scripts/
│  ├─ build-windows.bat
│  ├─ run-development.bat
│  └─ check.js
├─ src/
│  ├─ main/
│  ├─ preload/
│  ├─ renderer/
│  └─ services/
├─ tests/
├─ index.html
├─ package.json
├─ CHANGELOG.md
└─ README.md
```

## GitHub

```bash
git init
git add .
git commit -m "Fleet Desktop v0.1.2"
git branch -M main
git remote add origin <YOUR_GITHUB_REPOSITORY>
git push -u origin main
```

`.gitignore` ไม่รวม `node_modules`, local SQLite DB, attachments, backups และ build output `release/`

## Security / Production note

ก่อนใช้งาน Production เต็มรูปแบบยังต้องเพิ่ม Local Authentication, Permission enforcement, encryption/key management, signed exchange packages, Restore workflow และ security review
