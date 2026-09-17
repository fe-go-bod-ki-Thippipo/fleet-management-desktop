const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(){
  const STATE={
    maintenanceRequests:[{id:'R1',requestNo:'MR-0001',assetId:'A1',requestDate:'2026-09-10',requesterNameSnapshot:'สมชาย',urgency:'critical',issue:'เบรกมีเสียง',requestNote:'ตรวจด่วน',proposedVendorId:'V1',proposedVendorNameSnapshot:'อู่ เอ',estimatedCost:2500,status:'draft',attachments:[]}],
    assets:[{id:'A1',code:'FL-001',plate:'กก 1111',brandName:'Toyota',modelName:'Hilux',modelYear:2022,mileage:50000,meterUnit:'km',companyId:'C1',managingOperatingUnitId:'U1',deleted:false}],
    vendors:[{id:'V1',name:'อู่ เอ',contactName:'ช่างเอก',phone:'0812345678'}],
    workOrders:[],repairItems:[],partItems:[],labourItems:[],vendorDispatches:[],externalServiceCosts:[],generatedApprovalDocuments:[],returnedApprovalAttachments:[],externalApprovalResults:[],userAccounts:[{role:'admin',personId:'P-ADMIN',active:true}]
  };
  const calls={audit:[]};
  const content={innerHTML:'',insertAdjacentHTML(_w,h){this.innerHTML+=h},querySelector(){return null}};
  const requestApi={requestDetail(){}};
  const document={body:{appendChild(){}},createElement(){return{style:{},querySelector(){return null},querySelectorAll(){return[]}}},querySelector(){return null},addEventListener(){}};
  const ctx={STATE,CURRENT_ROLE:'admin',window:null,document,console,structuredClone,setTimeout:fn=>fn(),uid:p=>`${p}-1`,now:()=>'2026-09-10T06:00:00.000Z',coName:id=>id==='C1'?'บริษัท เอ':'-',ouName:id=>id==='U1'?'หน่วยกลาง':'-',pAudit:(...a)=>calls.audit.push(a),esc:v=>String(v??''),money:v=>String(Number(v||0)),kv:(k,v)=>`<div>${k}:${v}</div>`,content,dialog:{querySelector:()=>null},$:()=>null,$$:()=>[],toast:()=>{},formModal:()=>{},FileReader:function(){},MutationObserver:function(){this.observe=()=>{}}};
  ctx.window=ctx;ctx.window.FLEET_MAINTENANCE_REQUEST_TEST=requestApi;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-approval-document.js','utf8'),ctx);
  return {ctx,STATE,api:ctx.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_TEST};
}

test('urgency is rendered inside the document header meta block, not inside the request section',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  const metaBlock=html.slice(html.indexOf('apd-meta"'),html.indexOf('</div></div>\n    <section'));
  assert.match(metaBlock,/ความเร่งด่วน/);
  assert.match(metaBlock,/apd-urgency-critical/);
});

test('request section no longer shows เลขที่คำขอ/วันที่/ความเร่งด่วน as its own fields, but keeps the other fields',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  const requestSection=html.slice(html.indexOf('<span>คำขอ</span>'),html.indexOf('<span>ทรัพย์สิน</span>'));
  assert.doesNotMatch(requestSection,/เลขที่คำขอ/);
  assert.doesNotMatch(requestSection,/apd-label">วันที่</);
  assert.doesNotMatch(requestSection,/ความเร่งด่วน/);
  assert.match(requestSection,/ผู้แจ้ง/);
  assert.match(requestSection,/หน่วยงาน/);
  assert.match(requestSection,/อาการ \/ เหตุผล/);
  assert.match(requestSection,/หมายเหตุ/);
});

test('photo gallery images are sized in the enlarged ~180-200px range on screen',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  // force an image attachment through a second request with an attachment for this dedicated size check
  x.STATE.maintenanceRequests[0].attachments=[{id:'ATT1',name:'p.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'}];
  const d2=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d2);
  assert.match(html,/\.apd-photo-item\{width:19[0-9]px\}/);
  assert.match(html,/\.apd-photo-item img\{width:19[0-9]px;height:1[0-9]{2}px/);
});
