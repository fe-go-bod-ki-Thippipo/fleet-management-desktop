const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load(assetOverrides={}){
  let n=0;
  const STATE={
    workOrders:[],repairItems:[],maintenanceRequests:[{id:'R1',requestNo:'MR-1',assetId:'A1',maintenanceType:'repair',meterValue:10,issue:'Brake'}],
    assets:[{id:'A1',code:'CAR-001',plate:'ABC',brandName:'Toyota',modelName:'Hilux',mileage:12500,meterUnit:'km',companyId:'C1',managingOperatingUnitId:'OU1',...assetOverrides}],
    audit:[],userAccounts:[{role:'admin',personId:'PA',active:true}],people:[{id:'PER1',name:'นายผู้ดูแล รถทดสอบ'}]
  };
  const content={innerHTML:'',querySelector(){return null},insertAdjacentHTML(_,h){this.innerHTML+=h}};
  const ctx={
    STATE,CURRENT_ROLE:'admin',window:null,document:{},content,console,structuredClone,
    uid:p=>`${p}-${++n}`,now:()=>`2026-09-14T00:00:0${n}Z`,esc:v=>String(v??''),
    coName:id=>id==='C1'?'บริษัท ทดสอบ จำกัด':'-',ouName:id=>id==='OU1'?'หน่วยยานยนต์':'-',
    personName:id=>STATE.people.find(x=>x.id===id)?.name||'-',
    MutationObserver:function(){this.observe=()=>{}},setHead:()=>{},toast:()=>{},formModal:()=>{},setTimeout:f=>f(),
    $:()=>null,$$:()=>[],prompt:()=>'',addEventListener:()=>{},pAudit:()=>{}
  };
  ctx.window=ctx;
  ctx.FLEET_MAINTENANCE_REQUEST_TEST={requestDetail(){}};
  ctx.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_API={hasApprovedResult:id=>id==='R1',resultForRequest:()=>({externalApprovedAmount:500}),docsForRequest:()=>[]};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-workorder.js','utf8'),ctx);
  const w=ctx.FLEET_MAINTENANCE_WORKORDER_TEST.createFromRequest('R1');
  ctx.FLEET_MAINTENANCE_WORKORDER_TEST.workOrderDetail(w.id);
  return {ctx,STATE,content,w};
}

test('WorkOrder asset panel maps all supported assetCategory values and missing value',()=>{
  const cases=[['vehicle','รถยนต์/ยานพาหนะ'],['machinery','เครื่องจักร'],['equipment','อุปกรณ์'],['','-']];
  for(const [assetCategory,label] of cases){
    const x=load({assetCategory});
    assert.match(x.content.innerHTML,new RegExp(`<b>ประเภท</b><br>${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  }
});

test('WorkOrder asset panel resolves responsible person from responsiblePersonId',()=>{
  const x=load({responsiblePersonId:'PER1',responsibleText:'ข้อความสำรอง'});
  assert.match(x.content.innerHTML,/<b>ผู้ดูแล<\/b><br>นายผู้ดูแล รถทดสอบ/);
  assert.doesNotMatch(x.content.innerHTML,/<b>ผู้ดูแล<\/b><br>ข้อความสำรอง/);
});

test('WorkOrder asset panel falls back to responsibleText and then dash',()=>{
  const fallback=load({responsiblePersonId:'MISSING',responsibleText:'ผู้ดูแลจากข้อความเดิม'});
  assert.match(fallback.content.innerHTML,/<b>ผู้ดูแล<\/b><br>ผู้ดูแลจากข้อความเดิม/);
  const empty=load({responsiblePersonId:'MISSING',responsibleText:''});
  assert.match(empty.content.innerHTML,/<b>ผู้ดูแล<\/b><br>-<\/div>/);
});
