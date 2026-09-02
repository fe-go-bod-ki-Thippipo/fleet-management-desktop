/* v0.13.4 parity guards: Permission != Data Scope. Loaded after parity-baseline.js */
const P_ACTIONS={
 'vehicle.update':['admin','fleetOfficer'],'document.manage':['admin','fleetOfficer'],'usage.create':['admin','clerk'],'usage.approve':['admin','manager'],'usage.return':['admin','fleetOfficer'],
 'maintenance.manage':['admin','fleetOfficer'],'pm.manage':['admin','fleetOfficer'],'incident.manage':['admin','fleetOfficer'],'fuel.manage':['admin','fleetOfficer'],'expense.manage':['admin','fleetOfficer'],
 'person.manage':['admin','fleetOfficer'],'master.manage':['admin'],'owner.manage':['admin'],'audit.view':['admin'],'backup.manage':['admin']
};
function pCan(k){return (P_ACTIONS[k]||[]).includes(CURRENT_ROLE)}
function pRequire(k){if(pCan(k))return true;toast('บทบาทนี้ไม่มีสิทธิ์ดำเนินการ',true);return false}
function pScopedIds(){return new Set((STATE.assets||[]).filter(a=>!a.deleted&&parityScopeAsset(a)).map(a=>a.id))}
function pWithScope(fn){return function(...args){const ids=pScopedIds(),keep={assets:STATE.assets,documents:STATE.documents,usage:STATE.usage,maintenance:STATE.maintenance,pmPlans:STATE.pmPlans,fuel:STATE.fuel,expenses:STATE.expenses,incidents:STATE.incidents};STATE.assets=keep.assets.filter(a=>ids.has(a.id));STATE.documents=keep.documents.filter(x=>ids.has(x.assetId));STATE.usage=keep.usage.filter(x=>!x.assignedAssetId&&!x.requestedAssetId||ids.has(x.assignedAssetId||x.requestedAssetId));STATE.maintenance=keep.maintenance.filter(x=>ids.has(x.assetId));STATE.pmPlans=keep.pmPlans.filter(x=>ids.has(x.assetId));STATE.fuel=keep.fuel.filter(x=>ids.has(x.assetId));STATE.expenses=keep.expenses.filter(x=>ids.has(x.assetId));STATE.incidents=keep.incidents.filter(x=>ids.has(x.assetId));try{return fn(...args)}finally{Object.assign(STATE,keep)}}}
function pGuard(name,key,scope=false){const f=window[name]||globalThis[name];if(typeof f!=='function')return;const wrapped=function(...args){if(!pRequire(key))return;if(scope)return pWithScope(f)(...args);return f(...args)};globalThis[name]=wrapped}

/* Scope every operational page. */
for(const n of ['dashboardPage','documentPage','calendarPage','usagePage','maintenancePage','incidentPage','fuelPage','reportsPage']){const f=globalThis[n];if(typeof f==='function')globalThis[n]=pWithScope(f)}

/* Mutation/action permissions. */
for(const [n,k] of [['assetForm','vehicle.update'],['documentForm','document.manage'],['renewDocument','document.manage'],['usageForm','usage.create'],['approveUsage','usage.approve'],['returnUsage','usage.return'],['maintenanceForm','maintenance.manage'],['pmForm','pm.manage'],['fuelForm','fuel.manage'],['expenseForm','expense.manage'],['ownerForm2','owner.manage'],['personForm2','person.manage'],['userForm','master.manage'],['masterForm2','master.manage'],['basicOrgForm','master.manage']]){const f=globalThis[n];if(typeof f==='function')globalThis[n]=function(...args){if(!pRequire(k))return;return f(...args)}}

/* Hide action controls after each render according to role. */
const _renderGuard=render;render=function(){_renderGuard();setTimeout(()=>{const hide=(sel,ok)=>{document.querySelectorAll(sel).forEach(x=>x.classList.toggle('hidden',!ok))};hide('#addAsset,#editAsset',pCan('vehicle.update'));hide('#newDoc,#addDoc',pCan('document.manage'));hide('#newWO',pCan('maintenance.manage'));hide('#newPM',pCan('pm.manage'));hide('#newFuel',pCan('fuel.manage'));hide('#newExp',pCan('expense.manage'));hide('#newOwner,[data-owner-edit],[data-owner-toggle],[data-owner-delete]',pCan('owner.manage'));hide('#newPerson,#newUser,[data-person]',pCan('person.manage'));hide('#newMaster,[data-master-edit],[data-master-toggle],[data-master-delete]',pCan('master.manage'));},0)};

/* Local date key prevents UTC shift in Thailand calendar. */
function pLocalDateKey(d){const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`}
