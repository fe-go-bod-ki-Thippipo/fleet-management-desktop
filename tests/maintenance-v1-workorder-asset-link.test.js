const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');
function load(){
  let n=0;const elements={};const clicks=[];
  const STATE={workOrders:[],repairItems:[],maintenanceRequests:[],assets:[{id:'A1',status:'available',code:'A-1',plate:'กข 1234',deleted:false}],audit:[],userAccounts:[{role:'admin',personId:'PA',active:true}],vendors:[],vendorDispatches:[],partItems:[],labourItems:[],externalServiceCosts:[],inspections:[]};
  const content={innerHTML:'',querySelector(){return null},insertAdjacentHTML(_,h){this.innerHTML+=h}};
  const ctx={STATE,CURRENT_ROLE:'admin',window:null,content,console,structuredClone,uid:p=>`${p}-${++n}`,now:()=>`2026-09-15T00:00:${String(n).padStart(2,'0')}Z`,esc:v=>String(v??''),MutationObserver:function(){this.observe=()=>{}},setHead:()=>{},toast:()=>{},setTimeout:f=>{f();return 1},$$:()=>[],document:{addEventListener(){}},addEventListener(){},assetProfile:id=>clicks.push(id)};
  ctx.$=sel=>{if(typeof sel!=='string'||!sel.startsWith('#'))return null;const id=sel.slice(1);if(!content.innerHTML.includes(`id="${id}"`))return null;return elements[id]??={id};};
  ctx.formModal=()=>{};
  ctx.pAudit=()=>{};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-workorder.js','utf8'),ctx);
  const api=ctx.FLEET_MAINTENANCE_WORKORDER_TEST;
  const addWo=(over={})=>{const w={id:`W${STATE.workOrders.length+1}`,workOrderNo:`WO-${STATE.workOrders.length+1}`,assetId:'A1',maintenanceType:'repair',repairMode:'internal',status:'open',approvedAmount:null,outOfServiceAt:null,returnedToServiceAt:null,preRepairStatus:null,overBudgetNote:null,closedAt:null,closedBy:null,createdAt:'2026-09-15',...over};STATE.workOrders.push(w);STATE.repairItems.push({id:`R${STATE.repairItems.length+1}`,workOrderId:w.id,description:'เดิม',category:'repair',qty:1,status:'pending'});return w};
  return {ctx,STATE,api,addWo,content,clicks,element:id=>ctx.$(`#${id}`)};
}

test('WorkOrder Detail shows an open-asset button and it calls assetProfile with the correct asset id',()=>{
  const x=load(),w=x.addWo();
  x.api.workOrderDetail(w.id);
  assert.match(x.content.innerHTML,/id="woOpenAsset"/);
  x.element('woOpenAsset').onclick();
  assert.deepEqual(x.clicks,['A1']);
});

test('open-asset button is absent when the asset cannot be resolved',()=>{
  const x=load(),w=x.addWo({assetId:'MISSING'});
  x.api.workOrderDetail(w.id);
  assert.doesNotMatch(x.content.innerHTML,/id="woOpenAsset"/);
});

test('open-asset button does not throw when assetProfile is unavailable',()=>{
  const x=load(),w=x.addWo();
  delete x.ctx.assetProfile;
  x.api.workOrderDetail(w.id);
  assert.doesNotThrow(()=>x.element('woOpenAsset').onclick());
});
