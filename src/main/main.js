const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { DatabaseService } = require('../services/database');

let db;
app.setAppUserModelId('th.co.ngantavee.fleetdesktop');
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Fleet & Machinery Desktop',
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: { preload: path.join(__dirname, '../preload/preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, '../../index.html'));
}

app.whenReady().then(() => {
  const appData = path.join(app.getPath('userData'), 'fleet-data');
  fs.mkdirSync(appData, { recursive: true });
  fs.mkdirSync(path.join(appData, 'attachments'), { recursive: true });
  fs.mkdirSync(path.join(appData, 'backups'), { recursive: true });
  db = new DatabaseService(path.join(appData, 'fleet.sqlite3'), path.join(__dirname, '../../database/migrations'));
  db.migrate();

  ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataPath: appData }));
  ipcMain.handle('dashboard:summary', () => db.dashboardSummary());
  ipcMain.handle('assets:list', (_e, q) => db.listAssets(q || ''));
  ipcMain.handle('usage:list', () => db.listUsageRequests());
  ipcMain.handle('usage:create', (_e, payload) => db.createUsageRequest(payload));
  ipcMain.handle('usage:update-status', (_e, payload) => db.updateUsageStatus(payload));
  ipcMain.handle('usage:return', (_e, payload) => db.recordReturn(payload));
  ipcMain.handle('backup:create', async () => {
    const target = dialog.showSaveDialogSync({ title: 'สำรองฐานข้อมูล', defaultPath: `fleet-backup-${new Date().toISOString().slice(0,10)}.sqlite3` });
    if (!target) return null;
    db.backup(target); return target;
  });
  ipcMain.handle('file:open', (_e, filePath) => shell.openPath(filePath));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
