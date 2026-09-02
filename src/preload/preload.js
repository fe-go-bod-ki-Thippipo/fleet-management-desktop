const { contextBridge, ipcRenderer } = require('electron');
const invoke=(name,p)=>ipcRenderer.invoke(name,p);
contextBridge.exposeInMainWorld('fleet',{
 appInfo:()=>invoke('app:info'),dashboard:()=>invoke('dashboard:summary'),
 listAssets:q=>invoke('assets:list',q||''),getAsset:id=>invoke('assets:get',id),saveAsset:p=>invoke('assets:save',p),deleteAsset:id=>invoke('assets:delete',id),
 listDocuments:p=>invoke('documents:list',p||{}),saveDocument:p=>invoke('documents:save',p),renewDocument:p=>invoke('documents:renew',p),
 listPeople:q=>invoke('people:list',q||''),savePerson:p=>invoke('people:save',p),listUsers:()=>invoke('users:list'),saveUser:p=>invoke('users:save',p),
 listCompanies:()=>invoke('companies:list'),saveCompany:p=>invoke('companies:save',p),listSites:()=>invoke('sites:list'),saveSite:p=>invoke('sites:save',p),listOwners:()=>invoke('owners:list'),saveOwner:p=>invoke('owners:save',p),
 listMasters:t=>invoke('masters:list',t||''),saveMaster:p=>invoke('masters:save',p),listAudit:p=>invoke('audit:list',p||{}),
 listUsage:()=>invoke('usage:list'),getUsage:id=>invoke('usage:get',id),createUsage:p=>invoke('usage:create',p),updateUsageStatus:p=>invoke('usage:update-status',p),recordReturn:p=>invoke('usage:return',p),checkConflict:p=>invoke('usage:conflict',p),
 pickFile:p=>invoke('file:pick',p||{}),openFile:p=>invoke('file:open',p),backup:()=>invoke('backup:create'),restore:()=>invoke('backup:restore')
});
