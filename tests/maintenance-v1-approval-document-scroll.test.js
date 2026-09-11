const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(){
  const STATE={maintenanceRequests:[],assets:[],vendors:[],workOrders:[],repairItems:[],partItems:[],labourItems:[],vendorDispatches:[],externalServiceCosts:[],generatedApprovalDocuments:[],returnedApprovalAttachments:[],externalApprovalResults:[],userAccounts:[{role:'admin',personId:'P1',active:true}]};
  const content={innerHTML:'',querySelector(){return null;},insertAdjacentHTML(){}};
  const requestApi={requestDetail(){}};
  const document={overlay:null,body:{appendChild(el){document.overlay=el;}},createElement(){const sheet={style:{}};return {id:'',className:'',innerHTML:'',onclick:null,querySelector(sel){return sel==='.print-sheet'&&this.innerHTML.includes('class="print-sheet')?sheet:null;},querySelectorAll(){return[];},remove(){document.overlay=null;}};},querySelector(sel){return sel==='#apdViewerOverlay'?document.overlay:null;},addEventListener(){}};
  const ctx={STATE,CURRENT_ROLE:'admin',window:null,document,content,console,structuredClone,MutationObserver:function(){this.observe=()=>{};},uid:p=>`${p}-1`,now:()=> '2026-09-10T06:00:00.000Z',coName:()=>'-',ouName:()=>'-',pAudit:()=>{},esc:v=>String(v??''),money:v=>String(Number(v||0)),kv:(k,v)=>`<div>${k}:${v}</div>`,$:()=>null,$$:()=>[],toast:()=>{},formModal:()=>{},dialog:{querySelector:()=>null},FileReader:function(){},setTimeout:fn=>fn(),encodeURIComponent};
  ctx.window=ctx;ctx.window.print=()=>{};ctx.window.FLEET_MAINTENANCE_REQUEST_TEST=requestApi;
  vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-approval-document.js','utf8'),ctx);
  return {STATE,api:ctx.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_TEST,document};
}

function approvalDoc(){return {id:'D1',requestId:'R1',documentNo:'MR-0001-v1',generatedAt:'2026-09-10T06:00:00.000Z',superseded:false,snapshotData:{request:{requestNo:'MR-0001',requestDate:'2026-09-10',requesterNameSnapshot:'สมชาย',urgency:'high',issue:'เบรก',requestNote:''},asset:{code:'FL-001',plate:'กก 1111',brandName:'Toyota',modelName:'Hilux',modelYear:2022,mileage:50000,meterUnit:'km',companyName:'บริษัท เอ',unitName:'หน่วยกลาง',photoData:null},proposal:{vendorNameSnapshot:'อู่ เอ',vendorContact:'-',estimatedCost:2500},repairHistory:{last12MonthCount:0,last12MonthTotal:0,latest5:[]}}};}

test('viewDocument html preview wraps approval sheet in its own vertical scroll container',()=>{const x=load(),d=approvalDoc();x.STATE.generatedApprovalDocuments.push(d);const ov=x.api.viewDocumentById(d.id);assert.match(ov.innerHTML,/data-apd-html-scroll/);assert.match(ov.innerHTML,/overflow-y:auto/);assert.match(ov.innerHTML,/height:100%/);assert.match(ov.innerHTML,/class="print-sheet apd-sheet"/);});

test('returned image and pdf attachments do not use approval html scroll wrapper',()=>{for(const [id,uri] of [['I1','data:image/png;base64,AAAA'],['P1','data:application/pdf;base64,QUJD']]){const x=load();x.STATE.returnedApprovalAttachments.push({id,fileRef:uri});const ov=x.api.viewReturnedAttachmentById(id);assert.doesNotMatch(ov.innerHTML,/data-apd-html-scroll/);if(uri.startsWith('data:image/'))assert.match(ov.innerHTML,/<img /);else assert.match(ov.innerHTML,/<iframe /);}});

test('printSheetHtml uses non-header tag for document header while preserving header content',()=>{const x=load(),html=x.api.printSheetHtml(approvalDoc());assert.doesNotMatch(html,/<\/?header(?:\s|>)/i);assert.match(html,/<div class="apd-header">/);assert.match(html,/บริษัท เอ/);assert.match(html,/ใบขออนุมัติซ่อม/);assert.match(html,/เลขที่เอกสาร/);assert.match(html,/MR-0001-v1/);assert.doesNotMatch(html,/<\/?(?:aside|nav)(?:\s|>)/i);});
