const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function loadRequest({tab=[]}={}){
  const clicks=[];
  const boundNodes=[];
  const nodes={mrRows:{innerHTML:''},mrBack:{},mrEdit:{},mrCancel:{},mrOpenAsset:{}};
  const assetSelect={value:''},meter={value:''};
  let modalHtml='';
  const STATE={
    maintenanceRequests:[{id:'R1',requestNo:'MR-0001',assetId:'A1',requestDate:'2026-09-10',requesterId:'P1',requesterNameSnapshot:'สมชาย',issue:'เบรกมีเสียง',maintenanceType:'repair',urgency:'high',meterValue:1000,proposedVendorId:'',proposedVendorNameSnapshot:'',estimatedCost:0,requestNote:'',attachments:[{id:'ATT1',name:'photo.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'},{id:'ATT2',name:'report.pdf',type:'application/pdf',data:'data:application/pdf;base64,BBB'}],status:'draft',createdAt:'',updatedAt:'',createdBy:'admin',updatedBy:'admin'},
      {id:'R2',requestNo:'MR-0002',assetId:'A1',requestDate:'2026-09-10',requesterId:'P1',requesterNameSnapshot:'สมชาย',issue:'ยางรั่ว',maintenanceType:'repair',urgency:'low',meterValue:1000,proposedVendorId:'',proposedVendorNameSnapshot:'',estimatedCost:0,requestNote:'',attachments:[],status:'draft',createdAt:'',updatedAt:'',createdBy:'admin',updatedBy:'admin'}],
    workOrders:[{id:'W1',workOrderNo:'WO-0001',sourceRequestId:'R1',status:'open'}],
    audit:[],vendors:[],assets:[{id:'A1',code:'FL-020',plate:'กล 4270',mileage:1000,meterUnit:'km',deleted:false}],
    people:[{id:'P1',name:'สมชาย',active:true}],userAccounts:[],maintenance:[],pmPlans:[]
  };
  const bodyChildren=[];
  const documentMock={
    getElementById:id=>bodyChildren.find(n=>n.id===id)||null,
    createElement:()=>{const el={className:'',innerHTML:'',listeners:{},addEventListener(ev,fn){this.listeners[ev]=fn},querySelectorAll(sel){return sel==='[data-mr-viewer-close]'?[{addEventListener(ev,fn){el.closeFn=fn}}]:[]},remove(){const i=bodyChildren.indexOf(el);if(i>=0)bodyChildren.splice(i,1)}};return el;},
    body:{appendChild:el=>{bodyChildren.push(el);clicks.push(['viewerOpened',el.innerHTML]);}}
  };
  const relatedRows=[{dataset:{mrRelatedWo:'W1'},onclick:null}];
  const attachmentEls=[{dataset:{mrAttachmentView:'0'},onclick:null},{dataset:{mrAttachmentView:'1'},onclick:null}];
  const ctx={
    STATE,CURRENT_ROLE:'admin',window:null,console,structuredClone,FormData:global.FormData,FileReader:function(){},
    uid:p=>`${p}-1`,now:()=>'2026-09-10T04:00:00.000Z',today:()=>'2026-09-10',pAudit:()=>{},
    esc:v=>String(v??''),money:n=>String(n),pill:s=>`<pill>${s}</pill>`,kv:(a,b)=>`<div class="kv">${a}:${b}</div>`,
    content:{innerHTML:''},dialog:{querySelector:q=>q==='[name=assetId]'?assetSelect:q==='[name=meterValue]'?meter:null},
    $:q=>nodes[String(q).replace('#','')]||null,
    $$:sel=>sel==='[data-mr-related-wo]'?relatedRows:sel==='[data-mr-attachment-view]'?attachmentEls:[],
    setHead:()=>{},toast:()=>{},formModal:(_title,html)=>{modalHtml=html},confirm:()=>true,setTimeout:fn=>fn(),
    document:documentMock,
    assetProfile:id=>clicks.push(['assetProfile',id]),
    FLEET_MAINTENANCE_WORKORDER_API:{workOrderDetail:id=>clicks.push(['workOrderDetail',id])}
  };
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-request.js','utf8'),ctx);
  return {ctx,STATE,clicks,nodes,relatedRows,attachmentEls,api:ctx.FLEET_MAINTENANCE_REQUEST_TEST,getModalHtml:()=>modalHtml};
}

test('requestForm prefill pre-selects asset only when creating new, not when editing',()=>{
  const x=loadRequest();
  x.api.requestForm('',{assetId:'A1'});
  assert.match(x.getModalHtml(),/<option value="A1" selected>/);
  x.api.requestForm('R1',{assetId:'A1'});
  assert.match(x.getModalHtml(),/<option value="A1" selected>/);
});

test('requestForm() and requestForm(id) without prefill behave exactly as before',()=>{
  const x=loadRequest();
  x.api.requestForm();
  const assetBlock=x.getModalHtml().match(/name="assetId"[^]*?<\/select>/)[0];
  assert.doesNotMatch(assetBlock,/selected/);
  const y=loadRequest();
  y.api.requestForm('R1');
  const assetBlockEdit=y.getModalHtml().match(/name="assetId"[^]*?<\/select>/)[0];
  assert.match(assetBlockEdit,/<option value="A1" selected>/);
});

test('non-image attachment renders as a viewer button instead of a direct download link',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  assert.doesNotMatch(x.ctx.content.innerHTML,/href="data:application\/pdf[^"]*"\s+download/);
  assert.match(x.ctx.content.innerHTML,/data-mr-attachment-view="1"/);
});

test('image attachment keeps thumbnail and is clickable to open full view',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  assert.match(x.ctx.content.innerHTML,/<img src="data:image\/jpeg[^"]*" data-mr-attachment-view="0"/);
});

test('clicking a non-image attachment opens an overlay with iframe and download link, not immediate download',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  x.attachmentEls[1].onclick();
  const opened=x.clicks.find(c=>c[0]==='viewerOpened');
  assert.ok(opened,'overlay should have been appended');
  assert.match(opened[1],/<iframe src="data:application\/pdf/);
  assert.match(opened[1],/download="report.pdf"/);
});

test('clicking an image attachment opens overlay with <img>',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  x.attachmentEls[0].onclick();
  const opened=x.clicks.find(c=>c[0]==='viewerOpened');
  assert.match(opened[1],/<img src="data:image\/jpeg/);
});

test('request detail asset field opens Asset Detail via assetProfile',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  assert.match(x.ctx.content.innerHTML,/id="mrOpenAsset"/);
  x.ctx.$('#mrOpenAsset').onclick();
  assert.deepEqual(x.clicks.find(c=>c[0]==='assetProfile'),['assetProfile','A1']);
});

test('related WorkOrder row opens WorkOrder Detail via public API',()=>{
  const x=loadRequest();
  x.api.requestDetail('R1');
  assert.match(x.ctx.content.innerHTML,/data-mr-related-wo="W1"/);
  x.relatedRows[0].onclick();
  assert.deepEqual(x.clicks.find(c=>c[0]==='workOrderDetail'),['workOrderDetail','W1']);
});

test('request with no related WorkOrder renders empty state and no crash on missing API',()=>{
  const x=loadRequest();
  delete x.ctx.FLEET_MAINTENANCE_WORKORDER_API;
  assert.doesNotThrow(()=>x.api.requestDetail('R2'));
  assert.match(x.ctx.content.innerHTML,/ยังไม่มีงานซ่อมที่เกี่ยวข้อง/);
});
