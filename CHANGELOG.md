# CHANGELOG

## v0.1.2

- เพิ่ม Windows build/packaging foundation ด้วย electron-builder
- เพิ่ม `npm run build:win`, `build:installer`, `build:portable`
- เพิ่ม NSIS installer target และ Portable EXE target
- เพิ่ม Windows app icon (`build/icon.ico`)
- เพิ่ม `scripts/build-windows.bat` สำหรับ Build แบบดับเบิลคลิกบน Windows
- เพิ่ม `scripts/run-development.bat` สำหรับทดสอบโปรแกรม
- เพิ่ม GitHub Actions workflow สำหรับ Build Windows EXE
- เพิ่ม `asarUnpack` และ native dependency rebuild สำหรับ better-sqlite3
- อัปเดต Version เป็น 0.1.2

# Changelog

## v0.1.1
- เพิ่ม `index.html` ที่ root ของ repository
- เปลี่ยน Electron Main Process ให้โหลด root `index.html`
- ปรับ build config ให้รวม root `index.html`
- คง `src/renderer/index.html` ไว้เพื่อ compatibility
- ปรับ README และ version เป็น 0.1.1

## v0.1.0
- Initial Fleet Desktop foundation.
