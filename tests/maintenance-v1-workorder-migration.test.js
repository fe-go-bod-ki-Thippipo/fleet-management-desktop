const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(overrides={}){
  const STATE={
    maintenance:[
      {id:'OLD1',no:'WO-0001',assetId:'A1',maintenanceType:'repair',issue:'เปลี่ยนปั๊มน้ำ',meterValue:125000,vendor:'อู่ เอ',cost:2500,status:'closed',createdAt:'2026-01-10T00:00:00.000Z'},
      {id:'OLD2',no:'WO-0002',assetId:'A1',maintenanceType:'service',issue:'เช็กระยะ',meterValue:130000,vendor:'',cost:900,status:'done',createdAt:'2026-06-10T00:00:00.000Z'}
    ],vendors:[{id:'V1',code:'VEN-001',name:'อู่ เอ',type:'external',active:true,deleted:false}],workOrders:[],repairItems:[],partItems:[],labourItems:[],vendorDispatches:[],externalServiceCosts:[],inspections:[],
    fuel:[],expenses:[],usage:[],assets:[{id:'A1',plate:'กก 1111',deleted:false}],...overrides
  };
  let uidNo=1;const calls={audit:[],save:0};
  /* Keep boot timer inert in unit tests so each test explicitly controls when migration runs. */
  const ctx={STATE,window:null,console,setTimeout:()=>0,uid:p=>`${p}-T${uidNo++}`,now:()=> '2026-09-09T00:00:00.000Z',migrateState:()=>{},pAudit:(...a)=>calls.audit.push(a),save:()=>{calls.save++},reportsPage:()=>{},setHead:()=>{},content:{innerHTML:''},money:n=>String(n),simpleTable:()=>'',assetLabel:id=>id};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-workorder-migration.js','utf8'),ctx);return {ctx,STATE,api:ctx.FLEET_MAINTENANCE_MIGRATION_TEST,calls};
}

test('initializes WorkOrder subsystem arrays additively',()=>{const {STATE,api}=load({workOrders:undefined,repairItems:undefined});api.ensureWorkOrderState();assert.ok(Array.isArray(STATE.workOrders));assert.ok(Array.isArray(STATE.repairItems));assert.ok(Array.isArray(STATE.vendorDispatches));assert.ok(Array.isArray(STATE.externalServiceCosts));});

test('legacy status mapping follows approved migration table',()=>{const {api}=load();assert.equal(api.mapLegacyStatus('new'),'open');assert.equal(api.mapLegacyStatus('checking'),'open');assert.equal(api.mapLegacyStatus('repairing'),'in_progress');assert.equal(api.mapLegacyStatus('done'),'pending_inspection');assert.equal(api.mapLegacyStatus('closed'),'closed');});

test('migration preserves STATE.maintenance and creates WorkOrders without fabricated downtime',()=>{const {STATE,api}=load();STATE.legacyMaintenanceMigrated=false;const before=structuredClone(STATE.maintenance);const r=api.migrateLegacyMaintenance();assert.equal(r.migrated,2);assert.deepEqual(STATE.maintenance,before);assert.equal(STATE.workOrders.length,2);for(const w of STATE.workOrders){assert.equal(w.legacyImported,true);assert.equal(w.outOfServiceAt,null);assert.equal(w.returnedToServiceAt,null);assert.ok(w.legacySourceId);}assert.equal(STATE.workOrders[0].status,'closed');assert.equal(STATE.workOrders[1].status,'pending_inspection');});

test('migration is idempotent and repeated call does not duplicate records',()=>{const {STATE,api}=load();STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();const counts=[STATE.workOrders.length,STATE.repairItems.length,STATE.vendorDispatches.length,STATE.externalServiceCosts.length,STATE.labourItems.length];const r=api.migrateLegacyMaintenance();assert.equal(r.alreadyDone,true);assert.deepEqual([STATE.workOrders.length,STATE.repairItems.length,STATE.vendorDispatches.length,STATE.externalServiceCosts.length,STATE.labourItems.length],counts);});

test('legacy vendor text resolves existing Vendor Master without duplicate',()=>{const {STATE,api}=load();STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();assert.equal(STATE.vendors.length,1);const wo=STATE.workOrders.find(x=>x.legacySourceId==='OLD1');assert.equal(wo.vendorId,'V1');assert.equal(wo.vendorNameSnapshot,'อู่ เอ');});

test('unknown legacy vendor is created once with legacy-migration source',()=>{const {STATE,api}=load({maintenance:[{id:'OLDX',no:'WO-X',assetId:'A1',issue:'ซ่อม',vendor:'อู่ ใหม่',cost:100,status:'new'}]});STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();assert.equal(STATE.vendors.filter(v=>v.name==='อู่ ใหม่').length,1);assert.equal(STATE.vendors.find(v=>v.name==='อู่ ใหม่').source,'legacy-migration');});

test('legacy issue becomes RepairItem and legacy vendor cost becomes ExternalServiceCost via VendorDispatch',()=>{const {STATE,api}=load();STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();const wo=STATE.workOrders.find(x=>x.legacySourceId==='OLD1'),ri=STATE.repairItems.find(x=>x.workOrderId===wo.id),vd=STATE.vendorDispatches.find(x=>x.workOrderId===wo.id),cost=STATE.externalServiceCosts.find(x=>x.vendorDispatchId===vd.id);assert.match(ri.description,/ปั๊มน้ำ/);assert.equal(cost.amount,2500);assert.match(cost.note,/Legacy/);});

test('legacy cost without vendor remains represented and contributes to derived total',()=>{const {STATE,api}=load();STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();const wo=STATE.workOrders.find(x=>x.legacySourceId==='OLD2');assert.equal(api.workOrderTotalCost(wo.id),900);assert.equal(STATE.labourItems.find(x=>x.workOrderId===wo.id).lineTotal,900);});

test('derived WorkOrder total sums parts labour and external service cost without stored totalCost',()=>{const {STATE,api}=load({maintenance:[]});STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();STATE.workOrders.push({id:'W1',assetId:'A1',status:'open'});STATE.partItems.push({workOrderId:'W1',qty:2,unitCost:100});STATE.labourItems.push({workOrderId:'W1',hours:2,rate:50});STATE.vendorDispatches.push({id:'D1',workOrderId:'W1'});STATE.externalServiceCosts.push({vendorDispatchId:'D1',amount:300});assert.equal(api.workOrderTotalCost('W1'),600);assert.equal('totalCost' in STATE.workOrders[0],false);});

test('asset repair cost ignores cancelled WorkOrders',()=>{const {STATE,api}=load({maintenance:[]});STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();STATE.workOrders.push({id:'W1',assetId:'A1',status:'closed'},{id:'W2',assetId:'A1',status:'cancelled'});STATE.labourItems.push({workOrderId:'W1',lineTotal:500},{workOrderId:'W2',lineTotal:1000});assert.equal(api.assetRepairCost('A1'),500);});

test('migration writes one audit summary and preserves old expense source IDs',()=>{const {STATE,api,calls}=load({expenses:[{id:'E1',sourceId:'OLD1',type:'maintenance',amount:2500}]});STATE.legacyMaintenanceMigrated=false;api.migrateLegacyMaintenance();assert.equal(calls.audit.length,1);assert.equal(calls.audit[0][1],'workOrderMigration');assert.equal(STATE.expenses[0].sourceId,'OLD1');});

test('implementation stays isolated from locked Asset and Document modules',()=>{const src=fs.readFileSync('src/renderer/app/maintenance-v1-workorder-migration.js','utf8');assert.doesNotMatch(src,/assetProfile\s*=|documentPage\s*=|assetDocumentDetail\s*=|assetForm\s*=/);const index=fs.readFileSync('index.html','utf8');assert.match(index,/maintenance-v1-vendor-foundation\.js[\s\S]*maintenance-v1-workorder-migration\.js[\s\S]*maintenance-v1-legacy-vendor-patch\.js[\s\S]*maintenance-v1-request\.js[\s\S]*maintenance-v1-hub\.js[\s\S]*maintenance-v1-asset-integration\.js[\s\S]*parity-baseline\.js/);});
