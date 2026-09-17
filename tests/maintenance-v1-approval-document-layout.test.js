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

test('merged request+asset card no longer shows เลขที่คำขอ/วันที่/ความเร่งด่วน as their own fields, but keeps the other request fields and full asset fields',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  const cardStart=html.indexOf('<span>คำขอ / ทรัพย์สิน</span>');
  const cardEnd=html.indexOf('<span>ข้อเสนอซ่อม</span>');
  assert.ok(cardStart>=0&&cardEnd>cardStart,'merged request+asset card must exist as a single section before ข้อเสนอซ่อม');
  const mergedSection=html.slice(cardStart,cardEnd);
  assert.doesNotMatch(mergedSection,/เลขที่คำขอ/);
  assert.doesNotMatch(mergedSection,/apd-label">วันที่</);
  assert.doesNotMatch(mergedSection,/ความเร่งด่วน/);
  assert.match(mergedSection,/ผู้แจ้ง/);
  assert.match(mergedSection,/หน่วยงาน/);
  assert.match(mergedSection,/อาการ \/ เหตุผล/);
  assert.match(mergedSection,/หมายเหตุ/);
  assert.match(mergedSection,/รหัสทรัพย์สิน/);
  assert.match(mergedSection,/ทะเบียน \/ ชื่อ/);
  assert.match(mergedSection,/ยี่ห้อ \/ รุ่น/);
  // must appear as ONE apd-card, not two
  assert.equal((html.match(/class="apd-card"/g)||[]).length<=3,true,'request+asset must be merged into a single card, leaving at most: merged card, ข้อเสนอซ่อม, ผลอนุมัติภายนอก');
});

test('photo gallery markup and CSS are fully removed from printSheetHtml output (moved out to the future repair-history document instead)',()=>{
  const x=load();
  x.STATE.maintenanceRequests[0].attachments=[{id:'ATT1',name:'p.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'}];
  const d2=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d2);
  assert.doesNotMatch(html,/apd-photo-item/);
  assert.doesNotMatch(html,/รูปประกอบอาการ/);
  assert.equal(d2.snapshotData.attachments.length,1,'the underlying snapshot still captures the photo data for later reuse');
});

test('external approval signature line appears before the ผู้อนุมัติ/วันที่ labels',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  const sigStart=html.indexOf('class="apd-signature"');
  assert.ok(sigStart>=0,'apd-signature element must exist');
  const sigBlock=html.slice(sigStart,sigStart+600);
  const signLinePos=sigBlock.indexOf('ลายเซ็นผู้อนุมัติ');
  const approverLabelPos=sigBlock.indexOf('ผู้อนุมัติ ______');
  const datePos=sigBlock.indexOf('วันที่ ______');
  assert.ok(signLinePos>=0&&approverLabelPos>signLinePos,'ลายเซ็นผู้อนุมัติ must appear before the ผู้อนุมัติ label');
  assert.ok(datePos>signLinePos,'ลายเซ็นผู้อนุมัติ must appear before the วันที่ label');
});
