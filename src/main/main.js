const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { DatabaseService } = require('../services/database');
let db;
app.setAppUserModelId('th.co.ngantavee.fleetdesktop');
function createWindow(){const win=new BrowserWindow({width:1500,height:940,minWidth:1150,minHeight:720,title:'Fleet & Machinery Desktop',webPreferences:{preload:path.join(__dirname,'../preload/preload.js'),contextIsolation:true,nodeIntegration:false}});win.loadFile(path.join(__dirname,'../../index.html'));}
app.whenReady().then(()=>{
 const appData=path.join(app.getPath('userData'),'fleet-data'),attachments=path.join(appData,'attachments');fs.mkdirSync(attachments,{recursive:true});fs.mkdirSync(path.join(appData,'backups'),{recursive:true});db=new DatabaseService(path.join(appData,'fleet.sqlite3'),path.join(__dirname,'../../database/migrations'));db.migrate();
 const h=(n,fn)=>ipcMain.handle(n,fn);
 h('app:info',()=>({version:app.getVersion(),dataPath:appData,dbPath:path.join(appData,'fleet.sqlite3')}));h('dashboard:summary',()=>db.dashboardSummary());
 h('assets:list',(_e,q)=>db.listAssets(q||''));h('assets:get',(_e,id)=>db.getAsset(id));h('assets:save',(_e,p)=>db.saveAsset(p));h('assets:delete',(_e,id)=>db.deleteAsset(id));
 h('documents:list',(_e,p)=>db.listDocuments(p||{}));h('documents:save',(_e,p)=>db.saveDocument(p));h('documents:renew',(_e,p)=>db.renewDocument(p.id,p));
 h('people:list',(_e,q)=>db.listPeople(q||''));h('people:save',(_e,p)=>db.savePerson(p));h('users:list',()=>db.listUsers());h('users:save',(_e,p)=>db.saveUser(p));
 h('companies:list',()=>db.listCompanies());h('companies:save',(_e,p)=>db.saveCompany(p));h('sites:list',()=>db.listSites());h('sites:save',(_e,p)=>db.saveSite(p));h('owners:list',()=>db.listOwners());h('owners:save',(_e,p)=>db.saveOwner(p));h('masters:list',(_e,t)=>db.listMasters(t||''));h('masters:save',(_e,p)=>db.saveMaster(p));h('audit:list',(_e,p)=>db.listAudit(p?.entityType||null,p?.entityId||null,p?.limit||200));
 h('usage:list',()=>db.listUsageRequests());h('usage:get',(_e,id)=>db.getUsage(id));h('usage:create',(_e,p)=>db.createUsageRequest(p));h('usage:update-status',(_e,p)=>db.updateUsageStatus(p));h('usage:return',(_e,p)=>db.recordReturn(p));h('usage:conflict',(_e,p)=>db.checkAssetConflict(p.assetId,p.start,p.end,p.excludeId));
 h('file:pick',async(_e,{kind='attachment'}={})=>{const files=dialog.showOpenDialogSync({title:'เลือกไฟล์',properties:['openFile'],filters:[{name:'เอกสาร/รูปภาพ',extensions:['pdf','jpg','jpeg','png','webp']} ]});if(!files?.length)return null;const src=files[0],ext=path.extname(src),dest=path.join(attachments,`${Date.now()}-${path.basename(src).replace(/[^a-zA-Z0-9ก-๙._-]/g,'_')}`);fs.copyFileSync(src,dest);return dest;});
 h('file:open',(_e,p)=>p?shell.openPath(p):null);
 h('backup:create',async()=>{const target=dialog.showSaveDialogSync({title:'สำรองฐานข้อมูล',defaultPath:`fleet-backup-${new Date().toISOString().slice(0,10)}.sqlite3`,filters:[{name:'SQLite Backup',extensions:['sqlite3']}]});if(!target)return{ok:false};await db.backup(target);return{ok:true,path:target};});
 h('backup:restore',async()=>{const files=dialog.showOpenDialogSync({title:'เลือกไฟล์สำรอง',properties:['openFile'],filters:[{name:'SQLite Backup',extensions:['sqlite3','db']}]});if(!files?.length)return{ok:false};db.restore(files[0]);return{ok:true,path:files[0]};});
 createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
