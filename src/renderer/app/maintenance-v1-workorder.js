/* Maintenance Workflow v1 — Batch 6: Request -> Work Order (Internal Repair Core). */
(function(){
  let woPage=1,woPageSize=20,woSearch='',woStatus='';
  let activeRequestId='';
  const requestApi=window.FLEET_MAINTENANCE_REQUEST_TEST||null;
  const capturedRequestDetail=requestApi?.requestDetail||null;
  const approvalApi=()=>window.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_API||null;
  const knownRoles=new Set(['admin','manager','fleetOfficer','clerk','requester','viewer']);
  const role=()=>typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'';
  const canView=()=>knownRoles.has(role());
  const canManage=()=>['admin','manager','fleetOfficer'].includes(role());
  const canCancel=()=>['admin','manager'].includes(role());
  const actor=()=>{const r=role();if(!r)return '';return (STATE?.userAccounts||[]).find(x=>x&&x.role===r&&x.active!==false)?.personId||r;};
  const clone=x=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const ts=()=>typeof now==='function'?now():new Date().toISOString();

  function ensureState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.workOrders??=[];STATE.repairItems??=[];STATE.maintenanceRequests??=[];STATE.assets??=[];STATE.audit??=[];STATE.userAccounts??=[];
  }
  const requestById=id=>{ensureState();return STATE.maintenanceRequests.find(x=>x&&x.id===id)||null;};
  const workOrderById=id=>{ensureState();return STATE.workOrders.find(x=>x&&x.id===id)||null;};
  const assetById=id=>{ensureState();return STATE.assets.find(x=>x&&x.id===id&&!x.deleted)||STATE.assets.find(x=>x&&x.id===id)||null;};
  const itemsFor=id=>{ensureState();return STATE.repairItems.filter(x=>x&&x.workOrderId===id);};
  const hasWorkOrderFor=requestId=>{ensureState();return STATE.workOrders.some(x=>x&&x.sourceRequestId===requestId&&x.status!=='cancelled');};
  function approved(requestId){const api=approvalApi();return !!api?.hasApprovedResult&&api.hasApprovedResult(requestId)===true;}
  function approvalResult(requestId){const api=approvalApi();return api?.resultForRequest?api.resultForRequest(requestId):null;}
  function audit(action,id,before,after){if(typeof pAudit!=='function')throw Error('Audit service ไม่พร้อมใช้งาน');pAudit(action,'workOrder',id,before,after);}

  function nextWorkOrderNo(){
    ensureState();let max=0;const used=new Set();
    for(const w of STATE.workOrders){const no=String(w?.workOrderNo||'');used.add(no);const m=no.match(/^WO-(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0);}
    let n=max+1,no;do{no=`WO-${String(n++).padStart(4,'0')}`;}while(used.has(no));return no;
  }

  function createFromRequest(requestId){
    if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์สร้าง Work Order');
    ensureState();const r=requestById(requestId);if(!r)throw Error('ไม่พบคำขอซ่อม');
    if(!approved(requestId))throw Error('คำขอนี้ยังไม่มีผลอนุมัติที่อนุญาตให้สร้าง Work Order');
    const result=approvalResult(requestId),at=ts(),by=actor();
    const wo={id:typeof uid==='function'?uid('WO'):`WO-${Date.now()}`,workOrderNo:nextWorkOrderNo(),sourceRequestId:r.id,sourcePmPlanId:null,assetId:r.assetId,maintenanceType:r.maintenanceType,repairMode:'internal',status:'open',odometerAtOpen:r.meterValue,vendorId:r.proposedVendorId||'',vendorNameSnapshot:r.proposedVendorNameSnapshot||'',approvedAmount:result?.externalApprovedAmount??null,outOfServiceAt:null,returnedToServiceAt:null,preRepairStatus:null,overBudgetNote:null,openedAt:at,openedBy:by,closedAt:null,closedBy:null,cancelledReason:null,legacyImported:false,createdAt:at,updatedAt:at};
    STATE.workOrders.push(wo);
    STATE.repairItems.push({id:typeof uid==='function'?uid('RI'):`RI-${Date.now()}`,workOrderId:wo.id,category:r.maintenanceType,description:String(r.issue||'').trim(),qty:1,status:'pending'});
    audit('เปิดใบสั่งซ่อม',wo.id,null,clone(wo));return wo;
  }

  function transition(id,next){
    if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์เปลี่ยนสถานะ Work Order');
    const wo=workOrderById(id);if(!wo)throw Error('ไม่พบ Work Order');
    const allowed=wo.status==='open'&&next==='in_progress'||wo.status==='in_progress'&&next==='pending_inspection';
    if(!allowed)throw Error('ไม่สามารถเปลี่ยนสถานะตามลำดับที่ระบุได้');
    const before=clone(wo),at=ts();wo.status=next;wo.updatedAt=at;
    audit(next==='in_progress'?'เริ่มซ่อมภายใน':'แจ้งซ่อมเสร็จ รอตรวจรับ',wo.id,before,clone(wo));return wo;
  }
  function cancelWorkOrder(id,reason){
    if(!canCancel())throw Error('เฉพาะผู้จัดการหรือผู้ดูแลระบบเท่านั้นที่ยกเลิกงานได้');
    const wo=workOrderById(id);if(!wo)throw Error('ไม่พบ Work Order');if(wo.status==='cancelled')throw Error('Work Order นี้ถูกยกเลิกแล้ว');
    const why=String(reason||'').trim();if(!why)throw Error('กรุณาระบุเหตุผลการยกเลิก');
    const before=clone(wo);wo.status='cancelled';wo.cancelledReason=why;wo.updatedAt=ts();audit('ยกเลิกใบสั่งซ่อม',wo.id,before,clone(wo));return wo;
  }

  function assertItemMutable(wo){if(!wo)throw Error('ไม่พบ Work Order');if(wo.status==='cancelled')throw Error('ไม่สามารถแก้รายการซ่อมของ Work Order ที่ยกเลิกแล้ว');if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์แก้รายการซ่อม');}
  function addRepairItem(workOrderId,p){const wo=workOrderById(workOrderId);assertItemMutable(wo);const description=String(p.description||'').trim();if(!description)throw Error('กรุณาระบุรายการซ่อม');const item={id:typeof uid==='function'?uid('RI'):`RI-${Date.now()}`,workOrderId,category:String(p.category||wo.maintenanceType||'repair'),description,qty:Number(p.qty)||1,status:p.status==='done'?'done':'pending'};STATE.repairItems.push(item);const before=clone(wo);wo.updatedAt=ts();audit('เพิ่มรายการซ่อม',wo.id,before,{workOrder:clone(wo),repairItem:clone(item)});return item;}
  function editRepairItem(id,p){ensureState();const item=STATE.repairItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการซ่อม');const wo=workOrderById(item.workOrderId);assertItemMutable(wo);const description=String(p.description??item.description).trim();if(!description)throw Error('กรุณาระบุรายการซ่อม');const before=clone(item);Object.assign(item,{category:String(p.category??item.category),description,qty:Number(p.qty??item.qty)||1,status:p.status==='done'?'done':'pending'});wo.updatedAt=ts();audit('แก้ไขรายการซ่อม',wo.id,before,clone(item));return item;}
  function deleteRepairItem(id){ensureState();const item=STATE.repairItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการซ่อม');const wo=workOrderById(item.workOrderId);assertItemMutable(wo);if(itemsFor(wo.id).length<=1)throw Error('Work Order ต้องมีรายการซ่อมอย่างน้อย 1 รายการ');const before=clone(item);STATE.repairItems.splice(STATE.repairItems.indexOf(item),1);wo.updatedAt=ts();audit('ลบรายการซ่อม',wo.id,before,null);return true;}
  function toggleRepairItem(id,done){const item=STATE.repairItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการซ่อม');return editRepairItem(id,{...item,status:done?'done':'pending'});}

  const statusLabel=s=>({open:'เปิดงาน',in_progress:'กำลังซ่อม',pending_inspection:'รอตรวจรับ',cancelled:'ยกเลิก',closed:'ปิดงาน',dispatched:'ส่งซ่อมภายนอก'})[s]||s||'-';
  const typeLabel=s=>({repair:'ซ่อม',inspection:'ตรวจสอบ',service:'บำรุงรักษา'})[s]||s||'-';
  const assetLabelFor=id=>{const a=assetById(id);return a?(a.plate||a.code||a.name||'(ไม่มีทะเบียน)'):'-';};
  const requestLabel=id=>requestById(id)?.requestNo||'-';

  function filteredRows(){ensureState();const q=woSearch.trim().toLowerCase();return STATE.workOrders.filter(w=>{if(!w)return false;if(woStatus&&w.status!==woStatus)return false;if(!q)return true;return [w.workOrderNo,assetLabelFor(w.assetId),requestLabel(w.sourceRequestId),w.maintenanceType,statusLabel(w.status)].some(v=>String(v||'').toLowerCase().includes(q));});}
  function workOrderRegistry(host){
    if(!canView()){if(host)host.innerHTML='<div class="panel"><div class="empty">บทบาทนี้ไม่มีสิทธิ์ดูงานซ่อม</div></div>';return '';}
    const rows=filteredRows(),pages=Math.max(1,Math.ceil(rows.length/woPageSize));if(woPage>pages)woPage=pages;const start=(woPage-1)*woPageSize,list=rows.slice(start,start+woPageSize);
    const body=list.length?list.map(w=>`<tr data-wo-row="${esc(w.id)}"><td>${esc(w.workOrderNo||w.id)} ${w.legacyImported?'<span class="pill">Legacy</span>':''}</td><td>${esc(assetLabelFor(w.assetId))}</td><td>${w.sourceRequestId?`<button class="btn sm" data-wo-request="${esc(w.sourceRequestId)}">${esc(requestLabel(w.sourceRequestId))}</button>`:'-'}</td><td>${esc(typeLabel(w.maintenanceType))}</td><td><span class="pill">${esc(statusLabel(w.status))}</span></td><td>${esc(String(w.openedAt||w.createdAt||'-').slice(0,10))}</td><td><button class="btn sm" data-wo-open="${esc(w.id)}">เปิด</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">ยังไม่มีข้อมูล</div></td></tr>';
    const html=`<div class="panel"><div class="toolbar"><div><h3>งานซ่อม</h3><div class="muted">Work Order Registry</div></div><div><input id="woSearch" placeholder="ค้นหา" value="${esc(woSearch)}"> <select id="woStatus"><option value="">ทุกสถานะ</option>${['open','in_progress','pending_inspection','cancelled','closed'].map(s=>`<option value="${s}" ${woStatus===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select> <button class="btn" id="woClear">ล้าง</button></div></div><table><thead><tr><th>เลขที่</th><th>ทรัพย์สิน-ทะเบียน</th><th>ที่มา</th><th>ประเภทงาน</th><th>สถานะ</th><th>วันที่เปิด</th><th>จัดการ</th></tr></thead><tbody>${body}</tbody></table><div class="toolbar"><span class="muted">${rows.length} รายการ · หน้า ${woPage}/${pages}</span><div><select id="woPageSize">${[10,20,50].map(n=>`<option ${woPageSize===n?'selected':''}>${n}</option>`).join('')}</select> <button class="btn sm" id="woPrev" ${woPage<=1?'disabled':''}>ก่อนหน้า</button> <button class="btn sm" id="woNext" ${woPage>=pages?'disabled':''}>ถัดไป</button></div></div></div>`;
    if(!host)return html;host.innerHTML=html;bindRegistry(host);return html;
  }
  function bindRegistry(host){
    const q=s=>host.querySelector?.(s),qa=s=>[...(host.querySelectorAll?.(s)||[])];
    const render=()=>workOrderRegistry(host);
    if(q('#woSearch'))q('#woSearch').oninput=e=>{woSearch=e.target.value;woPage=1;render();};
    if(q('#woStatus'))q('#woStatus').onchange=e=>{woStatus=e.target.value;woPage=1;render();};
    if(q('#woClear'))q('#woClear').onclick=()=>{woSearch='';woStatus='';woPage=1;render();};
    if(q('#woPageSize'))q('#woPageSize').onchange=e=>{woPageSize=Number(e.target.value)||20;woPage=1;render();};
    if(q('#woPrev'))q('#woPrev').onclick=()=>{woPage=Math.max(1,woPage-1);render();};if(q('#woNext'))q('#woNext').onclick=()=>{woPage++;render();};
    qa('[data-wo-open]').forEach(b=>b.onclick=e=>{e.stopPropagation?.();workOrderDetail(b.dataset.woOpen);});qa('[data-wo-request]').forEach(b=>b.onclick=e=>{e.stopPropagation?.();openRequest(b.dataset.woRequest);});qa('[data-wo-row]').forEach(tr=>tr.onclick=()=>workOrderDetail(tr.dataset.woRow));
  }

  function auditHtml(id){const rows=(STATE.audit||[]).filter(a=>a&&a.entity==='workOrder'&&a.recordId===id).slice().reverse();return rows.length?`<table><thead><tr><th>เวลา</th><th>รายการ</th><th>ผู้ทำ</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.ts||'-')}</td><td>${esc(a.action||'-')}</td><td>${esc(a.user||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีประวัติ</div>';}
  function workOrderDetail(id){
    if(!canView())throw Error('บทบาทนี้ไม่มีสิทธิ์ดู Work Order');const wo=workOrderById(id);if(!wo)throw Error('ไม่พบ Work Order');const items=itemsFor(id),cancelled=wo.status==='cancelled';
    setHead?.(`Work Order ${wo.workOrderNo||''}`,'Job Center');
    const actions=canManage()&&!cancelled?`${wo.status==='open'?'<button class="btn primary" id="woStart">เริ่มซ่อม</button>':''}${wo.status==='in_progress'?'<button class="btn primary" id="woFinish">แจ้งซ่อมเสร็จ</button>':''}${canCancel()?'<button class="btn danger" id="woCancel">ยกเลิกงาน</button>':''}`:'';
    content.innerHTML=`<button class="btn" id="woBack">← กลับงานซ่อม</button><div class="panel"><div class="toolbar"><div><h2>${esc(wo.workOrderNo||wo.id)} ${wo.legacyImported?'<span class="pill">Legacy</span>':''}</h2><div>${esc(assetLabelFor(wo.assetId))} · <span class="pill">${esc(statusLabel(wo.status))}</span></div></div><div>${actions}</div></div></div><div class="panel"><h3>ที่มา</h3>${wo.sourceRequestId?`<button class="btn sm" id="woSourceRequest">${esc(requestLabel(wo.sourceRequestId))}</button>`:'<div class="muted">ข้อมูลเดิม / ไม่มีคำขอต้นทาง</div>'}</div><div class="panel"><div class="toolbar"><h3>รายการซ่อม</h3>${canManage()&&!cancelled?'<button class="btn primary" id="woAddItem">+ เพิ่มรายการ</button>':''}</div><table><thead><tr><th>เสร็จ</th><th>หมวด</th><th>รายละเอียด</th><th>จำนวน</th><th>จัดการ</th></tr></thead><tbody>${items.map(i=>`<tr><td><input type="checkbox" data-ri-toggle="${esc(i.id)}" ${i.status==='done'?'checked':''} ${canManage()&&!cancelled?'':'disabled'}></td><td>${esc(i.category||'-')}</td><td>${esc(i.description||'-')}</td><td>${esc(i.qty??1)}</td><td>${canManage()&&!cancelled?`<button class="btn sm" data-ri-edit="${esc(i.id)}">แก้ไข</button> <button class="btn sm" data-ri-delete="${esc(i.id)}">ลบ</button>`:'-'}</td></tr>`).join('')}</tbody></table></div><div class="panel"><h3>ค่าใช้จ่าย</h3><div class="empty">ยังไม่มีการบันทึกค่าใช้จ่าย (รองรับใน Batch 7)</div></div><div class="panel"><h3>ประวัติ / Audit</h3>${auditHtml(id)}</div>`;
    bindDetail(wo);
    return wo;
  }
  function bindDetail(wo){
    if($('#woBack'))$('#woBack').onclick=()=>{const host=content;workOrderRegistry(host)};
    if($('#woSourceRequest'))$('#woSourceRequest').onclick=()=>openRequest(wo.sourceRequestId);
    if($('#woStart'))$('#woStart').onclick=()=>{try{transition(wo.id,'in_progress');workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woFinish'))$('#woFinish').onclick=()=>{try{transition(wo.id,'pending_inspection');workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woCancel'))$('#woCancel').onclick=()=>{const reason=typeof prompt==='function'?prompt('เหตุผลการยกเลิก Work Order'):' ';if(reason==null)return;try{cancelWorkOrder(wo.id,reason);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woAddItem'))$('#woAddItem').onclick=()=>repairItemForm(wo.id);
    $$('[data-ri-edit]').forEach(b=>b.onclick=()=>repairItemForm(wo.id,b.dataset.riEdit));$$('[data-ri-delete]').forEach(b=>b.onclick=()=>{try{deleteRepairItem(b.dataset.riDelete);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});$$('[data-ri-toggle]').forEach(b=>b.onchange=()=>{try{toggleRepairItem(b.dataset.riToggle,b.checked);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});
  }
  function repairItemForm(workOrderId,itemId=''){
    const wo=workOrderById(workOrderId);assertItemMutable(wo);const old=itemId?STATE.repairItems.find(x=>x&&x.id===itemId):null;if(itemId&&!old)throw Error('ไม่พบรายการซ่อม');
    const html=`<label class="wide">รายละเอียด<input name="description" required value="${esc(old?.description||'')}"></label><label>หมวด<input name="category" value="${esc(old?.category||wo.maintenanceType||'repair')}"></label><label>จำนวน<input type="number" min="0.01" step="0.01" name="qty" value="${esc(old?.qty??1)}"></label>`;
    formModal(old?'แก้ไขรายการซ่อม':'เพิ่มรายการซ่อม',html,p=>{const x=old?editRepairItem(old.id,p):addRepairItem(workOrderId,p);setTimeout(()=>workOrderDetail(workOrderId),0);return x;});
  }

  function openRequest(id){if(capturedRequestDetail)return capturedRequestDetail(id);return requestApi?.requestDetail?.(id);}
  function appendCreateButton(requestId){
    activeRequestId=requestId;if(!approved(requestId)||!canManage())return false;if(content?.querySelector?.('#woCreatePanel'))return false;
    const html=`<div class="panel" id="woCreatePanel"><div class="toolbar"><div><h3>Work Order</h3><div class="muted">คำขอนี้ได้รับอนุมัติแล้ว สามารถสร้าง Work Order ได้มากกว่า 1 ใบ</div></div><button class="btn primary" id="woCreateFromRequest">สร้าง Work Order</button></div></div>`;
    content.insertAdjacentHTML?content.insertAdjacentHTML('beforeend',html):content.innerHTML+=html;
    const b=$('#woCreateFromRequest');if(b)b.onclick=()=>{try{const wo=createFromRequest(requestId);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};return true;
  }
  function wrappedRequestDetail(id){activeRequestId=id;if(capturedRequestDetail)capturedRequestDetail(id);appendCreateButton(id);}
  function restoreCreateButton(){if(!activeRequestId||!content?.querySelector)return false;if(content.querySelector('#woCreatePanel'))return false;if(!content.querySelector('#apdPanels'))return false;return appendCreateButton(activeRequestId);}
  let observer=null;if(typeof MutationObserver==='function'&&content){observer=new MutationObserver(()=>restoreCreateButton());observer.observe(content,{childList:true,subtree:true});}
  if(requestApi&&capturedRequestDetail)requestApi.requestDetail=wrappedRequestDetail;

  window.FLEET_MAINTENANCE_WORKORDER_API={workOrderRegistry,workOrderDetail,hasWorkOrderFor,createFromRequest};
  window.FLEET_MAINTENANCE_WORKORDER_TEST={ensureState,approved,approvalResult,nextWorkOrderNo,createFromRequest,transition,cancelWorkOrder,addRepairItem,editRepairItem,deleteRepairItem,toggleRepairItem,itemsFor,hasWorkOrderFor,filteredRows,workOrderRegistry,workOrderDetail,appendCreateButton,wrappedRequestDetail,restoreCreateButton,getActiveRequestId:()=>activeRequestId,canView,canManage,canCancel,statusLabel,auditHtml};
})();
