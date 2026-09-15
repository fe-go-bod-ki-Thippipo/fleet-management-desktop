const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load(role='admin'){
  let n=0;
  const audits=[];
  const elements={};
  let modal=null;
  const STATE={
    workOrders:[],repairItems:[],maintenanceRequests:[],assets:[],audit:[],
    userAccounts:[{role:'admin',personId:'PA',active:true},{role:'manager',personId:'PM',active:true},{role:'fleetOfficer',personId:'PF',active:true}],
    vendors:[
      {id:'V1',name:'อู่หนึ่ง',active:true,deleted:false},
      {id:'V2',name:'อู่สอง',active:true,deleted:false},
      {id:'VI',name:'อู่ปิดใช้งาน',active:false,deleted:false},
      {id:'VD',name:'อู่ลบ',active:true,deleted:true}
    ],
    vendorDispatches:[],partItems:[],labourItems:[],externalServiceCosts:[]
  };
  const content={innerHTML:'',querySelector(){return null},insertAdjacentHTML(_,h){this.innerHTML+=h}};
  const ctx={STATE,CURRENT_ROLE:role,window:null,content,console,structuredClone,uid:p=>`${p}-${++n}`,now:()=>`2026-09-14T00:00:${String(n).padStart(2,'0')}Z`,esc:v=>String(v??''),MutationObserver:function(){this.observe=()=>{}},setHead:()=>{},toast:()=>{},setTimeout:f=>{f();return 1},$$:()=>[],document:{addEventListener(){}},addEventListener(){}};
  ctx.$=sel=>{if(typeof sel!=='string'||!sel.startsWith('#'))return null;const id=sel.slice(1);if(!content.innerHTML.includes(`id="${id}"`))return null;return elements[id]??=( {id} );};
  ctx.formModal=(title,html,submit)=>{modal={title,html,submit};return modal;};
  ctx.pAudit=(action,entity,recordId,before,after)=>{const row={ts:ctx.now(),user:(STATE.userAccounts.find(x=>x.role===ctx.CURRENT_ROLE&&x.active!==false)?.personId||ctx.CURRENT_ROLE),action,entity,recordId,before,after};audits.push(row);STATE.audit.push(row)};
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-workorder.js','utf8'),ctx);
  const api=ctx.FLEET_MAINTENANCE_WORKORDER_TEST;
  const addWo=(over={})=>{const w={id:`W${STATE.workOrders.length+1}`,workOrderNo:`WO-${STATE.workOrders.length+1}`,assetId:'A1',maintenanceType:'repair',repairMode:'internal',status:'open',approvedAmount:1000,overBudgetNote:null,createdAt:'2026-09-14',...over};STATE.workOrders.push(w);return w};
  return {ctx,STATE,api,prod:ctx.FLEET_MAINTENANCE_WORKORDER_API,audits,role:r=>ctx.CURRENT_ROLE=r,addWo,content,element:id=>ctx.$(`#${id}`),modal:()=>modal};
}

test('dispatch external only from open and keeps WorkOrder vendor snapshot unchanged',()=>{
  const x=load(),w=x.addWo({vendorId:'SNAP',vendorNameSnapshot:'Snapshot Vendor'});
  const d=x.api.dispatchExternal(w.id,'V1');
  assert.equal(w.status,'dispatched');assert.equal(w.repairMode,'external');
  assert.equal(d.sequence,1);assert.equal(d.status,'active');assert.equal(d.vendorId,'V1');
  assert.equal(w.vendorId,'SNAP');assert.equal(w.vendorNameSnapshot,'Snapshot Vendor');
  assert.equal(x.api.currentVendorDispatch(w.id).id,d.id);
  assert.throws(()=>x.api.dispatchExternal(w.id,'V2'));
});

test('dispatch external validates active non-deleted vendor',()=>{
  const x=load(),a=x.addWo(),b=x.addWo(),c=x.addWo();
  assert.throws(()=>x.api.dispatchExternal(a.id,'VI'));
  assert.throws(()=>x.api.dispatchExternal(b.id,'VD'));
  assert.throws(()=>x.api.dispatchExternal(c.id,'MISSING'));
  assert.deepEqual(Array.from(x.api.activeVendors(),v=>v.id),['V1','V2']);
});

test('receive only from dispatched marks active dispatch received and moves to in_progress',()=>{
  const x=load(),w=x.addWo();const d=x.api.dispatchExternal(w.id,'V1');
  x.api.receiveFromVendor(w.id);
  assert.equal(d.status,'received');assert.ok(d.receivedAt);assert.equal(w.status,'in_progress');
  assert.equal(x.api.currentVendorDispatch(w.id),null);
  assert.throws(()=>x.api.receiveFromVendor(w.id));
});

test('change vendor requires dispatched and reason, preserves cancelled history, increments sequence',()=>{
  const x=load(),w=x.addWo();const old=x.api.dispatchExternal(w.id,'V1');
  assert.throws(()=>x.api.changeVendor(w.id,'V2',''));
  const next=x.api.changeVendor(w.id,'V2','อะไหล่ไม่พร้อม');
  assert.equal(w.status,'dispatched');assert.equal(old.status,'cancelled');assert.equal(old.reason,'อะไหล่ไม่พร้อม');
  assert.equal(next.sequence,2);assert.equal(next.status,'active');assert.equal(next.vendorId,'V2');
  assert.equal(x.STATE.vendorDispatches.length,2);assert.equal(x.api.currentVendorDispatch(w.id).id,next.id);
});

test('part labour external cost CRUD recalculates derived total',()=>{
  const x=load(),w=x.addWo({approvedAmount:99999});
  const p=x.api.addPartItem(w.id,{name:'ผ้าเบรก',qty:2,unitCost:125.50});
  const l=x.api.addLabourItem(w.id,{description:'ค่าแรง',hours:1.5,rate:200});
  assert.equal(x.api.totalCostFor(w.id),551);
  x.api.editPartItem(p.id,{name:'ผ้าเบรก',qty:3,unitCost:100});
  assert.equal(x.api.totalCostFor(w.id),600);
  assert.throws(()=>x.api.addExternalServiceCost(w.id,{amount:500}));
  x.api.dispatchExternal(w.id,'V1');
  const e=x.api.addExternalServiceCost(w.id,{invoiceNo:'INV-1',amount:450.75,note:'test'});
  assert.equal(x.api.totalCostFor(w.id),1050.75);
  x.api.editLabourItem(l.id,{description:'ค่าแรง',hours:2,rate:200});
  x.api.editExternalServiceCost(e.id,{amount:500.25});
  assert.equal(x.api.totalCostFor(w.id),1200.25);
  x.api.deletePartItem(p.id);x.api.deleteLabourItem(l.id);x.api.deleteExternalServiceCost(e.id);
  assert.equal(x.api.totalCostFor(w.id),0);
});

test('new external cost always binds active dispatch after vendor change',()=>{
  const x=load(),w=x.addWo();const d1=x.api.dispatchExternal(w.id,'V1');
  x.api.addExternalServiceCost(w.id,{amount:100});
  const d2=x.api.changeVendor(w.id,'V2','เปลี่ยนอู่');
  const e2=x.api.addExternalServiceCost(w.id,{amount:200});
  assert.equal(e2.vendorDispatchId,d2.id);assert.notEqual(e2.vendorDispatchId,d1.id);
  assert.equal(x.api.totalCostFor(w.id),300);
});

test('cost CRUD is blocked after WorkOrder cancelled',()=>{
  const x=load(),w=x.addWo();const p=x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:1});const l=x.api.addLabourItem(w.id,{description:'L',hours:1,rate:1});
  x.api.dispatchExternal(w.id,'V1');const e=x.api.addExternalServiceCost(w.id,{amount:1});
  x.api.cancelWorkOrder(w.id,'cancel');
  assert.throws(()=>x.api.addPartItem(w.id,{name:'B'}));assert.throws(()=>x.api.editPartItem(p.id,{name:'X'}));assert.throws(()=>x.api.deletePartItem(p.id));
  assert.throws(()=>x.api.addLabourItem(w.id,{description:'B'}));assert.throws(()=>x.api.editLabourItem(l.id,{description:'X'}));assert.throws(()=>x.api.deleteLabourItem(l.id));
  assert.throws(()=>x.api.addExternalServiceCost(w.id,{amount:2}));assert.throws(()=>x.api.editExternalServiceCost(e.id,{amount:2}));assert.throws(()=>x.api.deleteExternalServiceCost(e.id));
});

test('isOverBudget handles approved amount and null correctly',()=>{
  const x=load(),w=x.addWo({approvedAmount:100});
  x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:100});assert.equal(x.api.isOverBudget(w.id),false);
  x.api.addLabourItem(w.id,{description:'L',hours:1,rate:0.01});assert.equal(x.api.isOverBudget(w.id),true);
  const noLimit=x.addWo({approvedAmount:null});x.api.addPartItem(noLimit.id,{name:'Huge',qty:1,unitCost:999999});assert.equal(x.api.isOverBudget(noLimit.id),false);
});

test('over-budget note stays editable after cancellation but remains permission guarded',()=>{
  const x=load(),w=x.addWo({approvedAmount:10});
  x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:20});
  x.api.cancelWorkOrder(w.id,'cancel');
  assert.equal(x.api.isOverBudget(w.id),true);
  assert.doesNotThrow(()=>x.api.saveOverBudgetNote(w.id,'บันทึกหลังยกเลิก'));
  assert.equal(w.overBudgetNote,'บันทึกหลังยกเลิก');
  x.api.workOrderDetail(w.id);assert.match(x.content.innerHTML,/บันทึกหลังยกเลิก/);assert.match(x.content.innerHTML,/woEditOverBudgetNote/);assert.doesNotMatch(x.content.innerHTML,/woOverBudgetNote/);
  x.role('viewer');assert.throws(()=>x.api.saveOverBudgetNote(w.id,'ห้าม'));
});

test('over-budget note renders fallback and edit button for managing role',()=>{
  const x=load(),w=x.addWo({approvedAmount:10,overBudgetNote:null});
  x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:20});x.api.workOrderDetail(w.id);
  assert.match(x.content.innerHTML,/ยังไม่มีหมายเหตุ/);assert.match(x.content.innerHTML,/แก้ไขหมายเหตุ/);assert.ok(x.element('woEditOverBudgetNote'));
});

test('over-budget note edit opens formModal prefilled and saves through existing function',()=>{
  const x=load(),w=x.addWo({approvedAmount:10,overBudgetNote:'ค่าเดิม'});
  x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:20});x.api.workOrderDetail(w.id);
  x.element('woEditOverBudgetNote').onclick();
  assert.equal(x.modal().title,'แก้ไขหมายเหตุเกินวงเงิน');assert.match(x.modal().html,/ค่าเดิม/);
  x.modal().submit({note:'ค่าใหม่'});
  assert.equal(w.overBudgetNote,'ค่าใหม่');assert.match(x.content.innerHTML,/ค่าใหม่/);assert.ok(x.audits.some(a=>a.action==='บันทึกหมายเหตุเกินวงเงิน'));
});

test('over-budget note edit button is hidden for viewer',()=>{
  const x=load('viewer'),w=x.addWo({approvedAmount:10,overBudgetNote:'อ่านอย่างเดียว'});
  x.STATE.partItems.push({id:'P',workOrderId:w.id,name:'A',qty:1,unitCost:20});x.api.workOrderDetail(w.id);
  assert.match(x.content.innerHTML,/อ่านอย่างเดียว/);assert.doesNotMatch(x.content.innerHTML,/woEditOverBudgetNote/);assert.equal(x.element('woEditOverBudgetNote'),null);
});

test('over-budget note popup remains available on cancelled WorkOrder',()=>{
  const x=load(),w=x.addWo({approvedAmount:10,status:'cancelled',overBudgetNote:'ก่อนแก้'});
  x.STATE.partItems.push({id:'P',workOrderId:w.id,name:'A',qty:1,unitCost:20});x.api.workOrderDetail(w.id);
  const b=x.element('woEditOverBudgetNote');assert.ok(b);b.onclick();assert.match(x.modal().html,/ก่อนแก้/);x.modal().submit({note:'หลังยกเลิกยังแก้ได้'});
  assert.equal(w.overBudgetNote,'หลังยกเลิกยังแก้ได้');assert.match(x.content.innerHTML,/หลังยกเลิกยังแก้ได้/);
});

test('WorkOrder Detail header always shows approved amount when present',()=>{
  const x=load(),w=x.addWo({approvedAmount:1234.5});x.api.workOrderDetail(w.id);
  assert.match(x.content.innerHTML,/วงเงินอนุมัติ:<\/b> ฿1,234\.50/);
});

test('WorkOrder Detail header omits approved amount when null',()=>{
  const x=load(),w=x.addWo({approvedAmount:null});x.api.workOrderDetail(w.id);
  assert.doesNotMatch(x.content.innerHTML,/วงเงินอนุมัติ/);
});

test('permission fail-closed blocks every new mutation for unknown role',()=>{
  const x=load('unknown'),w=x.addWo();
  assert.throws(()=>x.api.dispatchExternal(w.id,'V1'));assert.throws(()=>x.api.receiveFromVendor(w.id));assert.throws(()=>x.api.changeVendor(w.id,'V2','x'));
  assert.throws(()=>x.api.addPartItem(w.id,{name:'A'}));assert.throws(()=>x.api.addLabourItem(w.id,{description:'L'}));assert.throws(()=>x.api.addExternalServiceCost(w.id,{amount:1}));
  assert.throws(()=>x.api.saveOverBudgetNote(w.id,'x'));
  x.role('viewer');assert.throws(()=>x.api.dispatchExternal(w.id,'V1'));
  x.role('fleetOfficer');assert.doesNotThrow(()=>x.api.addPartItem(w.id,{name:'A',qty:1,unitCost:1}));
});

test('audit labels cover dispatch receive change vendor and all cost CRUD',()=>{
  const x=load(),w=x.addWo();x.api.dispatchExternal(w.id,'V1');
  const e=x.api.addExternalServiceCost(w.id,{amount:10});x.api.editExternalServiceCost(e.id,{amount:11});x.api.deleteExternalServiceCost(e.id);
  const p=x.api.addPartItem(w.id,{name:'P',qty:1,unitCost:1});x.api.editPartItem(p.id,{name:'P2'});x.api.deletePartItem(p.id);
  const l=x.api.addLabourItem(w.id,{description:'L',hours:1,rate:1});x.api.editLabourItem(l.id,{description:'L2'});x.api.deleteLabourItem(l.id);
  x.api.changeVendor(w.id,'V2','reason');x.api.receiveFromVendor(w.id);
  const labels=x.audits.map(a=>a.action);
  for(const label of ['ส่งซ่อมอู่ภายนอก','รับคืนจากอู่','เปลี่ยนอู่ซ่อม','เพิ่มรายการอะไหล่','แก้ไขรายการอะไหล่','ลบรายการอะไหล่','เพิ่มรายการค่าแรง','แก้ไขรายการค่าแรง','ลบรายการค่าแรง','เพิ่มค่าใช้จ่ายอู่ภายนอก','แก้ไขค่าใช้จ่ายอู่ภายนอก','ลบค่าใช้จ่ายอู่ภายนอก'])assert.ok(labels.includes(label),label);
  assert.ok(x.audits.every(a=>a.entity==='workOrder'&&a.recordId===w.id));
});

test('legacy migrated costs remain included without using stored lineTotal',()=>{
  const x=load(),w=x.addWo({id:'LEG',legacyImported:true,repairMode:'external',approvedAmount:null});
  x.STATE.partItems.push({id:'P',workOrderId:w.id,name:'legacy part',qty:2,unitCost:50,lineTotal:9999,legacyImported:true});
  x.STATE.labourItems.push({id:'L',workOrderId:w.id,description:'legacy labour',hours:1,rate:75,lineTotal:75,legacyImported:true});
  x.STATE.vendorDispatches.push({id:'D',workOrderId:w.id,vendorId:'V1',sequence:1,status:'received',legacyImported:true});
  x.STATE.externalServiceCosts.push({id:'E',vendorDispatchId:'D',amount:125,legacyImported:true});
  assert.equal(x.api.totalCostFor(w.id),300);
  x.api.addPartItem(w.id,{name:'new',qty:1,unitCost:20});
  assert.equal(x.api.totalCostFor(w.id),320);
});

test('Batch 6 internal lifecycle remains unchanged when never dispatched',()=>{
  const x=load(),w=x.addWo();
  assert.equal(w.repairMode,'internal');assert.equal(x.STATE.vendorDispatches.length,0);
  x.api.transition(w.id,'in_progress');x.api.transition(w.id,'pending_inspection');
  assert.equal(w.status,'pending_inspection');assert.equal(w.repairMode,'internal');assert.equal(x.STATE.vendorDispatches.length,0);
});

test('detail renders cost blocks over-budget badge and dispatch history',()=>{
  const x=load(),w=x.addWo({approvedAmount:100});
  x.api.addPartItem(w.id,{name:'อะไหล่ทดสอบ',qty:2,unitCost:60});
  x.api.dispatchExternal(w.id,'V1');x.api.addExternalServiceCost(w.id,{amount:25});
  x.api.workOrderDetail(w.id);
  const h=x.content.innerHTML;
  assert.match(h,/อะไหล่/);assert.match(h,/ค่าแรง/);assert.match(h,/ค่าซ่อมภายนอก/);assert.match(h,/ยอดรวมทั้งหมด/);assert.match(h,/145\.00/);assert.match(h,/เกินวงเงินอนุมัติ/);assert.match(h,/ประวัติการส่งซ่อม/);assert.match(h,/อู่หนึ่ง/);assert.match(h,/วงเงินอนุมัติ/);
});

test('production API exposes totalCostFor and isOverBudget for Batch 8',()=>{
  const x=load();assert.equal(typeof x.prod.totalCostFor,'function');assert.equal(typeof x.prod.isOverBudget,'function');
});
