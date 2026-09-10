/* Maintenance Workflow v1 — Batch 3: legacy STATE.maintenance -> STATE.workOrders.
   Additive migration only. Keeps STATE.maintenance untouched as rollback/safety source. */
(function(){
  const n=s=>String(s??'').trim().toLowerCase();
  const num=v=>Number.isFinite(+v)?+v:0;
  const stamp=()=>typeof now==='function'?now():new Date().toISOString();

  function ensureWorkOrderState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.workOrders??=[];
    STATE.repairItems??=[];
    STATE.partItems??=[];
    STATE.labourItems??=[];
    STATE.vendorDispatches??=[];
    STATE.externalServiceCosts??=[];
    STATE.inspections??=[];
    STATE.vendors??=[];
  }

  function nextLegacyVendorCode(){
    let i=1;while(STATE.vendors.some(v=>String(v.code||'').toUpperCase()===`VEN-${String(i).padStart(3,'0')}`))i++;
    return `VEN-${String(i).padStart(3,'0')}`;
  }

  function resolveLegacyVendor(name){
    ensureWorkOrderState();const label=String(name||'').trim();if(!label)return null;
    let v=STATE.vendors.find(x=>n(x.name)===n(label));
    if(v)return v;
    v={id:typeof uid==='function'?uid('VEN'):`VEN-LEGACY-${STATE.vendors.length+1}`,code:nextLegacyVendorCode(),name:label,type:'external',contactName:'',phone:'',address:'',note:'นำเข้าจากประวัติงานซ่อมเดิม',active:true,deleted:false,source:'legacy-migration',createdAt:stamp(),updatedAt:stamp()};
    STATE.vendors.push(v);return v;
  }

  function mapLegacyStatus(status){
    return ({new:'open',checking:'open',repairing:'in_progress',done:'pending_inspection',closed:'closed'})[status]||'open';
  }

  function legacyWorkOrderId(legacy){return `WO-LEGACY-${String(legacy.id||legacy.no||STATE.maintenance.indexOf(legacy)+1).replace(/[^a-zA-Z0-9_-]/g,'-')}`;}

  function migrateLegacyMaintenance(){
    ensureWorkOrderState();
    if(STATE.legacyMaintenanceMigrated===true)return {migrated:0,skipped:(STATE.maintenance||[]).length,alreadyDone:true};
    const source=Array.isArray(STATE.maintenance)?STATE.maintenance:[];let migrated=0,skipped=0;
    for(const legacy of source){
      if(!legacy||!legacy.id){skipped++;continue;}
      if(STATE.workOrders.some(w=>w.legacyImported===true&&w.legacySourceId===legacy.id)){skipped++;continue;}
      const vendor=resolveLegacyVendor(legacy.vendorNameSnapshot||legacy.vendor||'');
      const wid=legacyWorkOrderId(legacy);
      const wo={
        id:wid,workOrderNo:legacy.no||wid,sourceRequestId:null,sourcePmPlanId:null,
        assetId:legacy.assetId||'',maintenanceType:legacy.maintenanceType||'repair',
        repairMode:vendor?'external':'internal',status:mapLegacyStatus(legacy.status),
        odometerAtOpen:num(legacy.meterValue),vendorId:vendor?.id||legacy.vendorId||'',
        vendorNameSnapshot:String(legacy.vendorNameSnapshot||vendor?.name||legacy.vendor||''),approvedAmount:null,
        outOfServiceAt:null,returnedToServiceAt:null,preRepairStatus:null,overBudgetNote:null,
        openedAt:legacy.openedAt||legacy.createdAt||null,openedBy:legacy.openedBy||null,
        closedAt:legacy.closedAt||null,closedBy:legacy.closedBy||null,cancelledReason:null,
        legacyImported:true,legacySourceId:legacy.id,createdAt:legacy.createdAt||null,updatedAt:legacy.updatedAt||legacy.createdAt||null
      };
      STATE.workOrders.push(wo);
      if(String(legacy.issue||'').trim())STATE.repairItems.push({id:`RI-${wid}`,workOrderId:wid,category:'legacy',description:String(legacy.issue),qty:1,status:wo.status==='closed'?'done':'open',legacyImported:true});
      const cost=num(legacy.cost);
      if(vendor){
        const dispatchId=`VD-${wid}`;
        STATE.vendorDispatches.push({id:dispatchId,workOrderId:wid,vendorId:vendor.id,sequence:1,dispatchedAt:null,receivedAt:null,status:wo.status==='closed'?'received':'active',reason:'นำเข้าจากระบบเดิม',legacyImported:true});
        if(cost)STATE.externalServiceCosts.push({id:`ESC-${wid}`,vendorDispatchId:dispatchId,invoiceNo:'',amount:cost,note:'ยอดยกมาจากระบบเดิม (Legacy)',legacyImported:true});
      }else if(cost){
        STATE.labourItems.push({id:`LAB-${wid}`,workOrderId:wid,description:'ยอดยกมาจากระบบเดิม (Legacy)',hours:1,rate:cost,lineTotal:cost,legacyImported:true});
      }
      migrated++;
    }
    STATE.legacyMaintenanceMigrated=true;
    if(migrated&&typeof pAudit==='function')pAudit('นำเข้าประวัติงานซ่อมเดิม','workOrderMigration','legacy-maintenance',null,{migrated,sourceCount:source.length});
    return {migrated,skipped,alreadyDone:false};
  }

  function workOrderTotalCost(woOrId){
    ensureWorkOrderState();const id=typeof woOrId==='string'?woOrId:woOrId?.id;if(!id)return 0;
    const parts=STATE.partItems.filter(x=>x.workOrderId===id).reduce((s,x)=>s+num(x.lineTotal!==undefined?x.lineTotal:num(x.qty)*num(x.unitCost)),0);
    const labour=STATE.labourItems.filter(x=>x.workOrderId===id).reduce((s,x)=>s+num(x.lineTotal!==undefined?x.lineTotal:num(x.hours)*num(x.rate)),0);
    const dispatchIds=new Set(STATE.vendorDispatches.filter(x=>x.workOrderId===id).map(x=>x.id));
    const external=STATE.externalServiceCosts.filter(x=>dispatchIds.has(x.vendorDispatchId)).reduce((s,x)=>s+num(x.amount),0);
    return parts+labour+external;
  }

  function assetRepairCost(assetId){ensureWorkOrderState();return STATE.workOrders.filter(x=>x.assetId===assetId&&x.status!=='cancelled').reduce((s,w)=>s+workOrderTotalCost(w.id),0);}

  const oldMigrate=typeof migrateState==='function'?migrateState:null;
  if(oldMigrate)migrateState=function(){oldMigrate();migrateLegacyMaintenance();};

  const legacyReportsPage=typeof reportsPage==='function'?reportsPage:null;
  if(legacyReportsPage)reportsPage=function(){
    ensureWorkOrderState();
    const fuel=STATE.fuel.reduce((s,x)=>s+num(x.amount),0),exp=STATE.expenses.reduce((s,x)=>s+num(x.amount),0),mt=STATE.workOrders.reduce((s,x)=>s+workOrderTotalCost(x.id),0);
    setHead('รายงาน');
    content.innerHTML=`<div class="cards"><div class="card"><span class="muted">ค่าเชื้อเพลิง</span><b>฿${money(fuel)}</b></div><div class="card"><span class="muted">Expense Ledger</span><b>฿${money(exp)}</b></div><div class="card"><span class="muted">ค่าซ่อม</span><b>฿${money(mt)}</b></div><div class="card"><span class="muted">รายการใช้งาน</span><b>${STATE.usage.length}</b></div></div><div class="panel"><h3>ต้นทุนรายทรัพย์สิน</h3>${simpleTable(STATE.assets.filter(x=>!x.deleted).map(a=>({asset:assetLabel(a.id),fuel:STATE.fuel.filter(x=>x.assetId===a.id).reduce((s,x)=>s+num(x.amount),0),repair:assetRepairCost(a.id),other:STATE.expenses.filter(x=>x.assetId===a.id&&x.type!=='fuel'&&x.type!=='maintenance').reduce((s,x)=>s+num(x.amount),0)})),[['asset','ทรัพย์สิน'],['fuel','น้ำมัน'],['repair','ซ่อม'],['other','อื่น']])}</div>`;
  };

  setTimeout(()=>{if(typeof STATE!=='object'||!STATE)return;const r=migrateLegacyMaintenance();if((r.migrated||!r.alreadyDone)&&typeof save==='function')save(false);},0);
  window.FLEET_MAINTENANCE_MIGRATION_TEST={ensureWorkOrderState,resolveLegacyVendor,mapLegacyStatus,migrateLegacyMaintenance,workOrderTotalCost,assetRepairCost};
})();
