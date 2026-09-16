const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function loadRequest(role='admin',nodes={}){
  const STATE={maintenanceRequests:[],workOrders:[],audit:[],vendors:[{id:'V1',name:'อู่ เอ',type:'external',active:true,deleted:false},{id:'V2',name:'อู่พักใช้',type:'external',active:false,deleted:false},{id:'V3',name:'อู่ลบแล้ว',type:'external',active:true,deleted:true},{id:'V4',name:'หน่วยซ่อมกลาง',type:'internal',active:true,deleted:false}],assets:[{id:'A1',code:'CAR-001',plate:'กข 1234',mileage:1000,meterUnit:'km',deleted:false}],people:[{id:'P1',name:'สมชาย',active:true},{id:'P2',name:'สมหญิง',active:true}],userAccounts:[{id:'U1',role:'requester',personId:'P1',active:true}],maintenance:[],pmPlans:[]};
  const calls={audit:[],toast:[],forms:[]};let n=1;
  const ctx={STATE,CURRENT_ROLE:role,window:null,console,structuredClone,FormData:global.FormData,FileReader:function(){},uid:p=>`${p}-${n++}`,now:()=>`2026-09-10T03:00:0${n}.000Z`,today:()=> '2026-09-10',pAudit:(...args)=>calls.audit.push(args),esc:v=>String(v??'').replace(/[&<>"']/g,''),money:n=>String(Number(n||0)),pill:s=>`<pill>${s}</pill>`,kv:(a,b)=>`${a}:${b}`,content:{innerHTML:''},dialog:{querySelector:()=>null},$:sel=>nodes[String(sel).replace('#','')]||null,$$:()=>[],setHead:()=>{},toast:m=>calls.toast.push(m),formModal:(title,html,submit)=>calls.forms.push({title,html,submit}),confirm:()=>true,setTimeout:fn=>fn()};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-request.js','utf8'),ctx);return {ctx,STATE,calls,api:ctx.FLEET_MAINTENANCE_REQUEST_TEST,nodes};
}
const valid={assetId:'A1',requestDate:'2026-09-10',requesterId:'P2',requesterName:'',issue:'เบรกมีเสียง',maintenanceType:'repair',urgency:'high',meterValue:'1001',proposedVendorId:'V1',estimatedCost:'1234.56',requestNote:'ตรวจด่วน'};

test('request number generation is sequential and unique',()=>{const {api,STATE}=loadRequest();STATE.maintenanceRequests.push({requestNo:'MR-0002'},{requestNo:'MR-0010'},{requestNo:'LEGACY'});assert.equal(api.nextRequestNo(),'MR-0011');const a=api.createRequest(valid),b=api.createRequest({...valid,issue:'ยางรั่ว'});assert.equal(a.requestNo,'MR-0011');assert.equal(b.requestNo,'MR-0012');assert.notEqual(a.requestNo,b.requestNo)});

test('role permissions cover all six roles and fail closed for unknown or undefined',()=>{const expected={admin:[1,1,1],manager:[1,1,1],fleetOfficer:[1,1,1],clerk:[0,0,0],requester:[1,0,0],viewer:[0,0,0],mystery:[0,0,0]};for(const [r,e] of Object.entries(expected)){const {api}=loadRequest(r);assert.deepEqual([+api.canCreate(),+api.canEdit(),+api.canCancel()],e,r)}const x=loadRequest();x.ctx.CURRENT_ROLE=undefined;assert.deepEqual([x.api.canCreate(),x.api.canEdit(),x.api.canCancel()],[false,false,false]);assert.equal(x.api.role(),'')});

test('CRUD enforcement blocks unauthorized roles and requester can create only own request',()=>{for(const r of ['clerk','viewer','mystery']){const {api}=loadRequest(r);assert.throws(()=>api.createRequest(valid),/ไม่มีสิทธิ์สร้าง/)}const req=loadRequest('requester');const x=req.api.createRequest({...valid,requesterId:'P2'});assert.equal(x.requesterId,'P1');assert.equal(x.requesterNameSnapshot,'สมชาย');assert.throws(()=>req.api.editRequest(x.id,valid),/ไม่มีสิทธิ์แก้ไข/);assert.throws(()=>req.api.cancelRequest(x.id),/ไม่มีสิทธิ์ยกเลิก/)});

test('Vendor dropdown source includes only active non-deleted rows and submit revalidates',()=>{const {api,STATE}=loadRequest();assert.deepEqual(Array.from(api.activeVendors(),v=>v.id),['V1','V4']);const x=api.createRequest(valid);assert.equal(x.proposedVendorId,'V1');assert.equal(x.proposedVendorNameSnapshot,'อู่ เอ');for(const id of ['V2','V3'])assert.throws(()=>api.createRequest({...valid,proposedVendorId:id}),/ไม่พร้อมใช้งาน/);STATE.vendors.find(v=>v.id==='V1').active=false;assert.throws(()=>api.editRequest(x.id,{...valid,proposedVendorId:'V1'}),/ไม่พร้อมใช้งาน/)});

test('create edit cancel use pAudit with maintenanceRequest entity',()=>{const {api,calls}=loadRequest();const x=api.createRequest(valid);api.editRequest(x.id,{...valid,issue:'แก้ไขอาการ'});api.cancelRequest(x.id);assert.equal(calls.audit.length,3);for(const a of calls.audit){assert.equal(a[1],'maintenanceRequest');assert.equal(a[2],x.id)}assert.deepEqual(calls.audit.map(a=>a[0]),['สร้างคำขอซ่อม','แก้ไขคำขอซ่อม','ยกเลิกคำขอซ่อม'])});

test('editRequest permits document_printed but still blocks approved rejected and cancelled',()=>{const allowed=loadRequest();const x=allowed.api.createRequest(valid);x.status='document_printed';const edited=allowed.api.editRequest(x.id,{...valid,issue:'ข้อมูลแก้ไขก่อนพิมพ์ v2'});assert.equal(edited.issue,'ข้อมูลแก้ไขก่อนพิมพ์ v2');assert.equal(edited.status,'document_printed');for(const status of ['approved','rejected','cancelled']){const y=loadRequest();const r=y.api.createRequest(valid);r.status=status;assert.throws(()=>y.api.editRequest(r.id,{...valid,issue:'ห้ามแก้'}),/เป็นร่างหรือพิมพ์เอกสารแล้วเท่านั้น/,status)}});

test('requestForm permits document_printed so versioning can edit before v2 while blocking final statuses',()=>{const x=loadRequest();const r=x.api.createRequest(valid);r.status='document_printed';x.api.requestForm(r.id);assert.equal(x.calls.forms.length,1);assert.match(x.calls.forms[0].title,/แก้ไขคำขอ/);for(const status of ['approved','rejected','cancelled']){const y=loadRequest();const q=y.api.createRequest(valid);q.status=status;y.api.requestForm(q.id);assert.equal(y.calls.forms.length,0);assert.match(y.calls.toast.at(-1),/เป็นร่างหรือพิมพ์เอกสารแล้วเท่านั้น/)}});

test('request statusLabel maps all five workflow statuses',()=>{const {api}=loadRequest();assert.deepEqual(['draft','document_printed','approved','rejected','cancelled'].map(s=>api.statusLabel(s)),['ร่าง','พิมพ์เอกสารแล้ว','อนุมัติ','ไม่อนุมัติ','ยกเลิก']);assert.equal(api.statusLabel('custom'),'custom');assert.equal(api.statusLabel(''),'-')});

test('registry renders Thai label matching each real request status',()=>{const nodes={mrRows:{innerHTML:''},mrQ:{value:''},mrStatus:{value:''},mrUrgency:{value:''},mrSize:{value:'20'}};const {api,STATE}=loadRequest('admin',nodes);for(const [i,status] of ['draft','document_printed','approved','rejected','cancelled'].entries())STATE.maintenanceRequests.push({id:`R${i}`,requestNo:`MR-000${i+1}`,assetId:'A1',requestDate:'2026-09-10',requesterNameSnapshot:'สมชาย',issue:`งาน ${i}`,urgency:'normal',proposedVendorNameSnapshot:'อู่ เอ',estimatedCost:100,status});api.renderRequestRows();for(const label of ['ร่าง','พิมพ์เอกสารแล้ว','อนุมัติ','ไม่อนุมัติ','ยกเลิก'])assert.match(nodes.mrRows.innerHTML,new RegExp(label));assert.match(nodes.mrRows.innerHTML,/data-mr-edit="R1"/);assert.doesNotMatch(nodes.mrRows.innerHTML,/data-mr-cancel="R1"/)});

test('cancel guard permits draft only',()=>{for(const status of ['document_printed','approved','rejected','cancelled']){const {api}=loadRequest();const x=api.createRequest(valid);x.status=status;assert.throws(()=>api.cancelRequest(x.id),/เฉพาะคำขอที่เป็นร่าง/)}const {api}=loadRequest();const x=api.createRequest(valid);assert.equal(api.cancelRequest(x.id).status,'cancelled')});

test('computed Work Order badge derives from STATE.workOrders and ignores cancelled WO',()=>{const {api,STATE}=loadRequest();const r={id:'MR-X'};assert.equal(api.hasWorkOrder(r),false);assert.match(api.workOrderBadge(r),/ยังไม่มี/);STATE.workOrders.push({id:'WO1',sourceRequestId:'MR-X',status:'cancelled'});assert.equal(api.hasWorkOrder(r),false);STATE.workOrders.push({id:'WO2',sourceRequestId:'MR-X',status:'open'});assert.equal(api.hasWorkOrder(r),true);assert.match(api.workOrderBadge(r),/มีแล้ว/)});

test('MaintenanceRequest model has no embedded approval or convertedWorkOrderId',()=>{const {api}=loadRequest();const x=api.createRequest(valid);for(const k of ['id','requestNo','assetId','requestDate','requesterId','requesterNameSnapshot','issue','maintenanceType','urgency','meterValue','proposedVendorId','proposedVendorNameSnapshot','estimatedCost','requestNote','attachments','status','createdAt','updatedAt','createdBy','updatedBy'])assert.ok(Object.hasOwn(x,k),k);assert.equal(Object.hasOwn(x,'convertedWorkOrderId'),false);assert.equal(Object.hasOwn(x,'approval'),false);assert.equal(x.status,'draft');assert.ok(Array.isArray(x.attachments))});

function loadHub(){const calls=[];const legacyBatch2=function batch2Page(){calls.push('legacy-batch2')};const nodes={maintenanceHubBody:{innerHTML:''},hubNewPM:{}};const content={innerHTML:''};const requestApi={requestRegistry:target=>{target.innerHTML='<div>REGISTRY</div>';calls.push('registry')}};const ctx={window:null,console,STATE:{maintenance:[],pmPlans:[],workOrders:[]},CURRENT_ROLE:'admin',maintenancePage:legacyBatch2,content,setHead:()=>{},$:s=>nodes[String(s).replace('#','')]||null,$$:()=>[],simpleTable:()=>'<table></table>',assetLabel:id=>id,pmForm:()=>calls.push('pm'),FLEET_MAINTENANCE_REQUEST_TEST:requestApi,CALLS:calls};ctx.window=ctx;vm.createContext(ctx);vm.runInContext("var view='dashboard'; function dashboardPage(){CALLS.push('dashboard')} function render(){const map={dashboard:dashboardPage,maintenance:maintenancePage};return (map[view]||dashboardPage)()}",ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-hub.js','utf8'),ctx);return {ctx,calls,legacyBatch2,api:ctx.FLEET_MAINTENANCE_HUB_TEST}};

test('maintenancePage captures Batch 2 patched page then reassigns to hub',()=>{const {ctx,legacyBatch2,api}=loadHub();assert.equal(api.capturedLegacyMaintenancePage,legacyBatch2);assert.notEqual(ctx.maintenancePage,legacyBatch2);assert.equal(ctx.maintenancePage,api.maintenanceHubPage);assert.equal(api.getTab(),'requests')});

test('regression isolation keeps non-maintenance render delegation unchanged',()=>{const {ctx,calls}=loadHub();ctx.view='dashboard';ctx.render();assert.equal(calls.at(-1),'dashboard')});

test('hub permission is fail closed when role is undefined',()=>{const {ctx,api}=loadHub();ctx.CURRENT_ROLE=undefined;assert.equal(api.canView(),false)});

test('Batch 4 integration stays additive and scripts load after Legacy Vendor Patch',()=>{const request=fs.readFileSync('src/renderer/app/maintenance-v1-request.js','utf8'),hub=fs.readFileSync('src/renderer/app/maintenance-v1-hub.js','utf8'),index=fs.readFileSync('index.html','utf8');for(const src of [request,hub])assert.doesNotMatch(src,/assetProfile\s*=|assetForm\s*=|documentPage\s*=|NAV\.push|PARITY_MENU\[/);assert.match(index,/maintenance-v1-legacy-vendor-patch\.js[\s\S]*maintenance-v1-request\.js[\s\S]*maintenance-v1-hub\.js/)});

test('deleteAttachment removes attachment when status draft/document_printed and blocked otherwise',()=>{
  const {api,STATE}=loadRequest();
  const x=api.createRequest({...valid});
  x.attachments=[{id:'ATT1',name:'photo.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'},{id:'ATT2',name:'report.pdf',type:'application/pdf',data:'data:application/pdf;base64,BBB'}];
  api.deleteAttachment(x.id,'ATT1');
  assert.deepEqual(x.attachments.map(a=>a.id),['ATT2']);
  x.status='approved';
  assert.throws(()=>api.deleteAttachment(x.id,'ATT2'),/แก้ไขไฟล์แนบได้เฉพาะคำขอที่เป็นร่างหรือพิมพ์เอกสารแล้วเท่านั้น/);
  x.status='document_printed';
  api.deleteAttachment(x.id,'ATT2');
  assert.equal(x.attachments.length,0);
});

test('renameAttachment updates name and blocks empty name',()=>{
  const {api}=loadRequest();
  const x=api.createRequest({...valid});
  x.attachments=[{id:'ATT1',name:'old.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'}];
  api.renameAttachment(x.id,'ATT1','new-name.jpg');
  assert.equal(x.attachments[0].name,'new-name.jpg');
  assert.throws(()=>api.renameAttachment(x.id,'ATT1','   '),/กรุณาระบุชื่อไฟล์/);
  assert.equal(x.attachments[0].data,'data:image/jpeg;base64,AAA','other fields must remain untouched');
});

test('attachment mutation permission is fail-closed for unauthorized roles',()=>{
  const owner=loadRequest();
  const x=owner.api.createRequest({...valid});
  x.attachments=[{id:'ATT1',name:'a.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'}];
  for(const r of ['clerk','viewer','requester','mystery']){
    const guest=loadRequest(r);
    guest.STATE.maintenanceRequests.push(x);
    assert.throws(()=>guest.api.deleteAttachment(x.id,'ATT1'),/ไม่มีสิทธิ์แก้ไข/);
    assert.throws(()=>guest.api.renameAttachment(x.id,'ATT1','x'),/ไม่มีสิทธิ์แก้ไข/);
  }
});

test('attachment delete/rename are audited under maintenanceRequest entity',()=>{
  const {api,calls}=loadRequest();
  const x=api.createRequest({...valid});
  x.attachments=[{id:'ATT1',name:'a.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'},{id:'ATT2',name:'b.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,BBB'}];
  api.renameAttachment(x.id,'ATT1','renamed.jpg');
  api.deleteAttachment(x.id,'ATT2');
  const actions=calls.audit.slice(-2);
  assert.deepEqual(actions.map(a=>a[0]),['แก้ไขชื่อไฟล์แนบ','ลบไฟล์แนบ']);
  for(const a of actions){assert.equal(a[1],'maintenanceRequest');assert.equal(a[2],x.id)}
});

test('attachment edit/delete controls render outside the .thumb box to avoid the locked overflow:hidden clipping',()=>{
  const {api,STATE}=loadRequest();
  const x=api.createRequest({...valid});
  x.attachments=[{id:'ATT1',name:'photo.jpg',type:'image/jpeg',data:'data:image/jpeg;base64,AAA'},{id:'ATT2',name:'report.pdf',type:'application/pdf',data:'data:application/pdf;base64,BBB'}];
  const imgHtml=api.attachmentHtml(x.attachments[0],true);
  const fileHtml=api.attachmentHtml(x.attachments[1],true);
  for(const html of [imgHtml,fileHtml]){
    const thumbClose=html.indexOf('</div>');
    const actionsStart=html.indexOf('class="thumb-actions"');
    assert.ok(thumbClose>=0&&actionsStart>=0,'both .thumb and thumb-actions must be present');
    assert.ok(actionsStart>thumbClose,'thumb-actions must start after the .thumb box closes, not nested inside it');
    assert.match(html,/data-mr-attachment-edit="ATT\d"/);
    assert.match(html,/data-mr-attachment-delete="ATT\d"/);
  }
  // non-mutable (e.g. request no longer editable) must render neither the actions block nor stray markup
  const readOnlyHtml=api.attachmentHtml(x.attachments[0],false);
  assert.doesNotMatch(readOnlyHtml,/thumb-actions/);
});
