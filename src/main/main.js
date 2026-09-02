const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { DatabaseService } = require('../services/database');

let db;
app.setAppUserModelId('th.co.ngantavee.fleetdesktop');
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Fleet & Machinery Desktop',
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

  ipcMain.handle('app:info', () => ({ version: app.getVersion(), dataPath: appData, dbPath:path.join(appData,'fleet.sqlite3') }));
  ipcMain.handle('dashboard:summary', () => db.dashboardSummary());
  ipcMain.handle('assets:list', (_e, q) => db.listAssets(q || ''));
  ipcMain.handle('assets:get', (_e, id) => db.getAsset(id));
  ipcMain.handle('assets:save', (_e, payload) => db.saveAsset(payload));
  ipcMain.handle('assets:delete', (_e, id) => db.deleteAsset(id));
  ipcMain.handle('people:list', () => db.listPeople());
  ipcMain.handle('people:save', (_e,payload)=>db.savePerson(payload));
  ipcMain.handle('companies:list', () => db.listCompanies());
  ipcMain.handle('companies:save', (_e,payload)=>db.saveCompany(payload));
  ipcMain.handle('sites:list', () => db.listSites());
  ipcMain.handle('sites:save', (_e,payload)=>db.saveSite(payload));
  ipcMain.handle('owners:list', () => db.listOwners());
  ipcMain.handle('owners:save', (_e,payload)=>db.saveOwner(payload));
  ipcMain.handle('usage:list', () => db.listUsageRequests());
  ipcMain.handle('usage:get', (_e,id) => db.getUsage(id));
  ipcMain.handle('usage:create', (_e, payload) => db.createUsageRequest(payload));
  ipcMain.handle('usage:update-status', (_e, payload) => db.updateUsageStatus(payload));
  ipcMain.handle('usage:return', (_e, payload) => db.recordReturn(payload));
  ipcMain.handle('usage:conflict', (_e,payload)=>db.checkAssetConflict(payload.assetId,payload.start,payload.end,payload.excludeId));
  ipcMain.handle('backup:create', async () => {
    const target = dialog.showSaveDialogSync({ title: 'สำรองฐานข้อมูล', defaultPath: `fleet-backup-${new Date().toISOString().slice(0,10)}.sqlite3`, filters:[{name:'SQLite Backup',extensions:['sqlite3']}] });
    if (!target) return {ok:false};
    await db.backup(target); return {ok:true,path:target};
  });
  ipcMain.handle('backup:restore', async () => {
    const files=dialog.showOpenDialogSync({title:'เลือกไฟล์สำรอง',properties:['openFile'],filters:[{name:'SQLite Backup',extensions:['sqlite3','db']}]});
    if(!files?.length) return {ok:false};
    db.restore(files[0]); return {ok:true,path:files[0]};
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
