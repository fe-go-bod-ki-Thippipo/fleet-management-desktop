const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function loadUi(){
  const nodes={
    mrRows:{innerHTML:''},mrQ:{value:''},mrStatus:{value:''},mrUrgency:{value:''},mrSize:{value:'20'},
    mrBack:{},mrAssetInfo:{innerHTML:''},mrMeterWarn:{textContent:'',classList:{toggle(){}}}
  };
  const assetSelect={value:'A1'},meter={value:'1000'};
  let modalHtml='';
  const STATE={maintenanceRequests:[{id:'R1',requestNo:'MR-0001',assetId:'A1',requestDate:'2026-09-10',requesterId:'P1',requesterNameSnapshot:'สมชาย',issue:'เบรกมีเสียง',maintenanceType:'repair',urgency:'high',meterValue:1000,proposedVendorId:'',proposedVendorNameSnapshot:'',estimatedCost:0,requestNote:'',attachments:[],status:'draft',createdAt:'',updatedAt:'',createdBy:'admin',updatedBy:'admin'}],workOrders:[],audit:[],vendors:[],assets:[{id:'A1',code:'FL-020',plate:'กล 4270',brandName:'Brand',modelName:'Model',mileage:1000,meterUnit:'km',deleted:false}],people:[{id:'P1',name:'สมชาย',active:true}],userAccounts:[],maintenance:[],pmPlans:[]};
  const ctx={STATE,CURRENT_ROLE:'admin',window:null,console,structuredClone,FormData:global.FormData,FileReader:function(){},uid:p=>`${p}-1`,now:()=> '2026-09-10T04:00:00.000Z',today:()=> '2026-09-10',pAudit:()=>{},esc:v=>String(v??''),money:n=>String(n),pill:s=>`<pill>${s}</pill>`,kv:(a,b)=>`<div>${a}:${b}</div>`,content:{innerHTML:''},dialog:{querySelector:q=>q==='[name=assetId]'?assetSelect:q==='[name=meterValue]'?meter:null},$:q=>nodes[String(q).replace('#','')]||null,$$:()=>[],setHead:()=>{},toast:()=>{},formModal:(_title,html)=>{modalHtml=html},confirm:()=>true,setTimeout:fn=>fn()};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-request.js','utf8'),ctx);
  return {ctx,STATE,nodes,api:ctx.FLEET_MAINTENANCE_REQUEST_TEST,getModalHtml:()=>modalHtml};
}

test('registry renders plate-only asset label',()=>{const x=loadUi();x.api.renderRequestRows();assert.match(x.nodes.mrRows.innerHTML,/กล 4270/);assert.doesNotMatch(x.nodes.mrRows.innerHTML,/FL-020/)});

test('request detail renders plate-only asset label',()=>{const x=loadUi();x.api.requestDetail('R1');assert.match(x.ctx.content.innerHTML,/ทรัพย์สิน:กล 4270/);assert.doesNotMatch(x.ctx.content.innerHTML,/FL-020/)});

test('request form dropdown and readonly asset info use plate-only label',()=>{const x=loadUi();x.api.requestForm();const html=x.getModalHtml();assert.match(html,/>กล 4270<\/option>/);assert.doesNotMatch(html,/>FL-020 · กล 4270<\/option>/);assert.match(x.nodes.mrAssetInfo.innerHTML,/<b>กล 4270<\/b>/);assert.doesNotMatch(x.nodes.mrAssetInfo.innerHTML,/FL-020/)});
