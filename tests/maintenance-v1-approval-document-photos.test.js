const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(role='admin',overrides={}){
  const STATE={
    maintenanceRequests:[{id:'R1',requestNo:'MR-0001',assetId:'A1',requestDate:'2026-09-10',requesterNameSnapshot:'สมชาย',urgency:'high',issue:'เบรกมีเสียง',requestNote:'ตรวจด่วน',proposedVendorId:'V1',proposedVendorNameSnapshot:'อู่ เอ',estimatedCost:2500,status:'draft',updatedAt:'',updatedBy:'',
      attachments:[
        {id:'ATT1',name:'damage1.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'},
        {id:'ATT2',name:'damage2.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,BBB'},
        {id:'ATT3',name:'damage3.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,CCC'},
        {id:'ATT4',name:'damage4.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,DDD'},
        {id:'ATT5',name:'damage5.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,EEE'},
        {id:'ATT6',name:'report.pdf',type:'application/pdf',data:'data:application/pdf;base64,FFF'}
      ]}],
    assets:[{id:'A1',code:'FL-001',plate:'กก 1111',brandName:'Toyota',modelName:'Hilux',modelYear:2022,mileage:50000,meterUnit:'km',companyId:'C1',managingOperatingUnitId:'U1',deleted:false}],
    vendors:[{id:'V1',name:'อู่ เอ',contactName:'ช่างเอก',phone:'0812345678'}],
    workOrders:[],repairItems:[],partItems:[],labourItems:[],vendorDispatches:[],externalServiceCosts:[],generatedApprovalDocuments:[],returnedApprovalAttachments:[],externalApprovalResults:[],userAccounts:[{role:'admin',personId:'P-ADMIN',active:true}],...overrides
  };
  const calls={audit:[],detail:0,print:0,observer:0,forms:[],opened:[]};
  let observerCallback=null;
  class FakeMutationObserver{constructor(cb){observerCallback=cb;}observe(){calls.observer++;}}
  const content={innerHTML:'',insertAdjacentHTML(_where,html){this.innerHTML+=html},querySelector(sel){if(sel==='#mrBack')return this.innerHTML.includes('id="mrBack"')?{}:null;if(sel==='#apdPanels')return this.innerHTML.includes('id="apdPanels"')?{}:null;return null;}};
  const requestApi={requestDetail(id){calls.detail++;content.innerHTML=`<button id="mrBack">back</button><div id="legacy-detail">${id}</div>`;}};
  const dialogNodes={};
  const dialog={querySelector:sel=>dialogNodes[sel]||null};
  const formModal=(title,html,submit)=>{calls.forms.push({title,html,submit});};
  const document={overlay:null,body:{appendChild(el){document.overlay=el;}},createElement(){const closeButtons=[{},{}],sheet={style:{}};const el={id:'',className:'',innerHTML:'',onclick:null,closeButtons,sheet,querySelector(sel){return sel==='.print-sheet'&&this.innerHTML.includes('class="print-sheet')?sheet:null;},querySelectorAll(sel){return sel==='[data-apd-viewer-close]'?closeButtons:[];},remove(){if(document.overlay===el)document.overlay=null;el.removed=true;}};return el;},querySelector(sel){return sel==='#apdViewerOverlay'?document.overlay:null;},addEventListener(){}};
  const ctx={STATE,CURRENT_ROLE:role,window:null,document,console,structuredClone,setTimeout:fn=>fn(),uid:p=>`${p}-${Math.random().toString(36).slice(2,8)}`,now:()=> '2026-09-10T06:00:00.000Z',coName:id=>id==='C1'?'บริษัท เอ':'-',ouName:id=>id==='U1'?'หน่วยกลาง':'-',pAudit:(...a)=>calls.audit.push(a),esc:v=>String(v??''),money:v=>String(Number(v||0)),kv:(k,v)=>`<div>${k}:${v}</div>`,content,$:()=>null,$$:()=>[],toast:()=>{},formModal,dialog,FileReader:function(){},MutationObserver:FakeMutationObserver,encodeURIComponent};
  ctx.window=ctx;ctx.window.print=()=>{calls.print++};ctx.window.open=()=>{calls.opened.push(true);return null;};ctx.window.FLEET_MAINTENANCE_REQUEST_TEST=requestApi;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-approval-document.js','utf8'),ctx);
  return {ctx,STATE,calls,api:ctx.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_TEST,prod:ctx.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_API,content};
}

test('buildSnapshot keeps only image attachments and caps at 4, storing name/data only',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  assert.equal(d.snapshotData.attachments.length,4);
  assert.deepEqual(d.snapshotData.attachments.map(a=>a.name),['damage1.jpg','damage2.jpg','damage3.jpg','damage4.jpg']);
  assert.deepEqual(Object.keys(d.snapshotData.attachments[0]).sort(),['data','name']);
  assert.ok(!d.snapshotData.attachments.some(a=>a.name==='report.pdf'),'pdf must be excluded from snapshot');
});

test('printSheetHtml no longer renders the photo gallery section on screen/print, even though the snapshot still captures up to 4 image attachments',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  assert.doesNotMatch(html,/รูปประกอบอาการ/);
  assert.doesNotMatch(html,/apd-photo-item/);
  assert.equal(d.snapshotData.attachments.length,4,'snapshot must still capture the photos for the future repair-history document, even though this document no longer prints them');
  assert.equal(d.snapshotData.attachments[0].name,'damage1.jpg');
});

test('printSheetHtml omits photo gallery section entirely when request has no image attachments',()=>{
  const x=load('admin',{maintenanceRequests:[{id:'R1',requestNo:'MR-0001',assetId:'A1',requestDate:'2026-09-10',requesterNameSnapshot:'สมชาย',urgency:'high',issue:'เบรกมีเสียง',requestNote:'',proposedVendorId:'V1',proposedVendorNameSnapshot:'อู่ เอ',estimatedCost:2500,status:'draft',attachments:[]}]});
  const d=x.api.generateApprovalDocument('R1');
  const html=x.api.printSheetHtml(d);
  assert.doesNotMatch(html,/รูปประกอบอาการ/);
});

test('legacy snapshot without attachments field renders without throwing and without gallery',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const legacyDoc={...d,snapshotData:{...d.snapshotData}};
  delete legacyDoc.snapshotData.attachments;
  assert.doesNotThrow(()=>x.api.printSheetHtml(legacyDoc));
  assert.doesNotMatch(x.api.printSheetHtml(legacyDoc),/รูปประกอบอาการ/);
});

test('generated document photo snapshot stays frozen after the source request attachment is later renamed or deleted',()=>{
  const x=load();
  const d=x.api.generateApprovalDocument('R1');
  const originalFirstPhotoName=d.snapshotData.attachments[0].name;
  assert.equal(originalFirstPhotoName,'damage1.jpg');
  // mutate the live request's attachments after the document was already generated
  const liveRequest=x.STATE.maintenanceRequests[0];
  liveRequest.attachments[0].name='renamed-after-print.jpg';
  liveRequest.attachments.splice(1,1); // delete the 2nd attachment
  // re-render the already generated v1 document
  const htmlAfterMutation=x.api.printSheetHtml(d);
  assert.doesNotMatch(htmlAfterMutation,/renamed-after-print\.jpg/,'the document no longer prints photos at all, so the rename must not leak in either');
  assert.equal(d.snapshotData.attachments[0].name,'damage1.jpg','frozen snapshot must still hold the original name internally even though it is no longer printed');
  assert.equal(d.snapshotData.attachments.length,4,'frozen snapshot count must be unaffected by later deletion of the live request attachments');
  assert.equal(Object.isFrozen(d.snapshotData.attachments),true,'snapshot attachments array must be frozen');
  assert.equal(Object.isFrozen(d.snapshotData.attachments[0]),true,'each snapshot attachment object must be frozen');
});
