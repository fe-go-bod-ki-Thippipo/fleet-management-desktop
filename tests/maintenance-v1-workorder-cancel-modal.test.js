const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load(){
  const cancelButton={onclick:null};
  const timers=[];
  let modal=null,promptCalls=0,n=0;
  const STATE={
    workOrders:[{id:'W1',workOrderNo:'WO-0001',sourceRequestId:null,assetId:'A1',maintenanceType:'repair',repairMode:'internal',status:'open',odometerAtOpen:100,openedAt:'2026-09-14T00:00:00Z'}],
    repairItems:[{id:'RI1',workOrderId:'W1',category:'repair',description:'Brake',qty:1,status:'pending'}],
    maintenanceRequests:[],
    assets:[{id:'A1',code:'CAR-001',plate:'ABC',mileage:120,meterUnit:'km'}],
    audit:[],
    userAccounts:[{role:'admin',personId:'PA',active:true}]
  };
  const content={innerHTML:'',querySelector(){return null},insertAdjacentHTML(_,html){this.innerHTML+=html}};
  const document={addEventListener(){}};
  const ctx={
    STATE,CURRENT_ROLE:'admin',window:null,document,content,console,structuredClone,
    uid:p=>`${p}-${++n}`,now:()=>`2026-09-14T00:00:0${n}Z`,esc:v=>String(v??''),
    coName:()=>'-',ouName:()=>'-',personName:()=>'-',setHead:()=>{},toast:()=>{},
    MutationObserver:function(){this.observe=()=>{}},
    setTimeout:f=>{timers.push(f);return timers.length},
    $:s=>s==='#woCancel'?cancelButton:null,$$:()=>[],
    prompt:()=>{promptCalls++;return 'legacy prompt';},
    formModal:(title,html,cb)=>{modal={title,html,cb,cancel(){}}},
    addEventListener(){}
  };
  ctx.pAudit=(action,entity,recordId,before,after)=>STATE.audit.push({ts:ctx.now(),user:'PA',action,entity,recordId,before,after});
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-workorder.js','utf8'),ctx);
  const flush=()=>{while(timers.length)timers.shift()()};
  return {ctx,STATE,cancelButton,getModal:()=>modal,getPromptCalls:()=>promptCalls,flush};
}

test('WorkOrder cancel button opens app formModal and never calls prompt',()=>{
  const x=load();
  x.ctx.FLEET_MAINTENANCE_WORKORDER_TEST.workOrderDetail('W1');
  assert.equal(typeof x.cancelButton.onclick,'function');
  x.cancelButton.onclick();
  const modal=x.getModal();
  assert.ok(modal);
  assert.equal(modal.title,'ยกเลิก Work Order');
  assert.match(modal.html,/เหตุผลการยกเลิก/);
  assert.match(modal.html,/name="reason"/);
  assert.match(modal.html,/required/);
  assert.equal(x.getPromptCalls(),0);
  assert.equal(x.STATE.workOrders[0].status,'open');
});

test('saving WorkOrder cancel form passes entered reason and changes status to cancelled',()=>{
  const x=load();
  x.ctx.FLEET_MAINTENANCE_WORKORDER_TEST.workOrderDetail('W1');
  x.cancelButton.onclick();
  const modal=x.getModal();
  modal.cb({reason:'ยกเลิกเนื่องจากอะไหล่ไม่พร้อม'});
  assert.equal(x.STATE.workOrders[0].status,'cancelled');
  assert.equal(x.STATE.workOrders[0].cancelledReason,'ยกเลิกเนื่องจากอะไหล่ไม่พร้อม');
  assert.ok(x.STATE.audit.some(a=>a.entity==='workOrder'&&a.action==='ยกเลิกใบสั่งซ่อม'));
  assert.equal(x.getPromptCalls(),0);
});

test('closing WorkOrder cancel form without submit does not cancel the WorkOrder',()=>{
  const x=load();
  x.ctx.FLEET_MAINTENANCE_WORKORDER_TEST.workOrderDetail('W1');
  x.cancelButton.onclick();
  const modal=x.getModal();
  modal.cancel();
  assert.equal(x.STATE.workOrders[0].status,'open');
  assert.equal(x.STATE.workOrders[0].cancelledReason,undefined);
  assert.equal(x.STATE.audit.length,0);
  assert.equal(x.getPromptCalls(),0);
});
