/* Maintenance Workflow v1 — Batch 7: Request -> Work Order + External Repair / Cost. */
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
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const money=v=>num(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  function ensureState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.workOrders??=[];STATE.repairItems??=[];STATE.maintenanceRequests??=[];STATE.assets??=[];STATE.audit??=[];STATE.userAccounts??=[];
    STATE.vendors??=[];STATE.vendorDispatches??=[];STATE.partItems??=[];STATE.labourItems??=[];STATE.externalServiceCosts??=[];
  }
  const requestById=id=>{ensureState();return STATE.maintenanceRequests.find(x=>x&&x.id===id)||null;};
  const workOrderById=id=>{ensureState();return STATE.workOrders.find(x=>x&&x.id===id)||null;};
  const assetById=id=>{ensureState();return STATE.assets.find(x=>x&&x.id===id&&!x.deleted)||STATE.assets.find(x=>x&&x.id===id)||null;};
  const itemsFor=id=>{ensureState();return STATE.repairItems.filter(x=>x&&x.workOrderId===id);};
  const hasWorkOrderFor=requestId=>{ensureState();return STATE.workOrders.some(x=>x&&x.sourceRequestId===requestId&&x.status!=='cancelled');};
  const activeVendors=()=>{ensureState();return STATE.vendors.filter(v=>v&&v.active===true&&v.deleted===false);};
  const vendorById=id=>{ensureState();return STATE.vendors.find(v=>v&&v.id===id)||null;};
  const dispatchesFor=id=>{ensureState();return STATE.vendorDispatches.filter(x=>x&&x.workOrderId===id);};
  const currentVendorDispatch=id=>dispatchesFor(id).filter(x=>x.status==='active').sort((a,b)=>(num(b.sequence)-num(a.sequence))||String(b.dispatchedAt||'').localeCompare(String(a.dispatchedAt||'')))[0]||null;
  const partsFor=id=>{ensureState();return STATE.partItems.filter(x=>x&&x.workOrderId===id);};
  const labourFor=id=>{ensureState();return STATE.labourItems.filter(x=>x&&x.workOrderId===id);};
  const externalCostsFor=id=>{const ids=new Set(dispatchesFor(id).map(x=>x.id));ensureState();return STATE.externalServiceCosts.filter(x=>x&&ids.has(x.vendorDispatchId));};
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

  function assertNewAction(wo){if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์ดำเนินการ');if(!wo)throw Error('ไม่พบ Work Order');}
  function validateVendor(vendorId){const v=activeVendors().find(x=>x.id===vendorId);if(!v)throw Error('กรุณาเลือกผู้ให้บริการที่ยังใช้งานอยู่');return v;}
  function dispatchExternal(workOrderId,vendorId){
    const wo=workOrderById(workOrderId);assertNewAction(wo);if(wo.status!=='open')throw Error('ส่งซ่อมภายนอกได้เฉพาะ Work Order สถานะเปิดงาน');
    const v=validateVendor(vendorId);const before=clone(wo),at=ts();const seq=Math.max(0,...dispatchesFor(wo.id).map(x=>num(x.sequence)))+1;
    const d={id:typeof uid==='function'?uid('VD'):`VD-${Date.now()}`,workOrderId:wo.id,vendorId:v.id,sequence:seq,dispatchedAt:at,receivedAt:null,status:'active',reason:null};
    STATE.vendorDispatches.push(d);wo.repairMode='external';wo.status='dispatched';wo.updatedAt=at;
    audit('ส่งซ่อมอู่ภายนอก',wo.id,before,{workOrder:clone(wo),vendorDispatch:clone(d)});return d;
  }
  function receiveFromVendor(workOrderId){
    const wo=workOrderById(workOrderId);assertNewAction(wo);if(wo.status!=='dispatched')throw Error('รับคืนจากอู่ได้เฉพาะ Work Order ที่กำลังส่งซ่อมภายนอก');
    const d=currentVendorDispatch(wo.id);if(!d)throw Error('ไม่พบรายการส่งซ่อมที่กำลังใช้งาน');const before={workOrder:clone(wo),vendorDispatch:clone(d)},at=ts();
    d.status='received';d.receivedAt=at;wo.status='in_progress';wo.updatedAt=at;audit('รับคืนจากอู่',wo.id,before,{workOrder:clone(wo),vendorDispatch:clone(d)});return d;
  }
  function changeVendor(workOrderId,vendorId,reason){
    const wo=workOrderById(workOrderId);assertNewAction(wo);if(wo.status!=='dispatched')throw Error('เปลี่ยนอู่ได้เฉพาะ Work Order ที่กำลังส่งซ่อมภายนอก');
    const why=String(reason||'').trim();if(!why)throw Error('กรุณาระบุเหตุผลการเปลี่ยนอู่');const v=validateVendor(vendorId),old=currentVendorDispatch(wo.id);if(!old)throw Error('ไม่พบอู่ปัจจุบัน');
    const before={workOrder:clone(wo),vendorDispatch:clone(old)},at=ts();old.status='cancelled';old.reason=why;
    const d={id:typeof uid==='function'?uid('VD'):`VD-${Date.now()}`,workOrderId:wo.id,vendorId:v.id,sequence:Math.max(0,...dispatchesFor(wo.id).map(x=>num(x.sequence)))+1,dispatchedAt:at,receivedAt:null,status:'active',reason:null};
    STATE.vendorDispatches.push(d);wo.updatedAt=at;audit('เปลี่ยนอู่ซ่อม',wo.id,before,{workOrder:clone(wo),oldDispatch:clone(old),newDispatch:clone(d)});return d;
  }

  function assertCostMutable(wo){if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์แก้ไขค่าใช้จ่าย');if(!wo)throw Error('ไม่พบ Work Order');if(wo.status==='cancelled')throw Error('ไม่สามารถแก้ไขค่าใช้จ่ายของ Work Order ที่ยกเลิกแล้ว');}
  function addPartItem(workOrderId,p){const wo=workOrderById(workOrderId);assertCostMutable(wo);const name=String(p.name||'').trim();if(!name)throw Error('กรุณาระบุชื่ออะไหล่');const item={id:typeof uid==='function'?uid('PART'):`PART-${Date.now()}`,workOrderId:wo.id,name,qty:num(p.qty)||1,unitCost:num(p.unitCost)};STATE.partItems.push(item);audit('เพิ่มรายการอะไหล่',wo.id,null,clone(item));return item;}
  function editPartItem(id,p){ensureState();const item=STATE.partItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการอะไหล่');const wo=workOrderById(item.workOrderId);assertCostMutable(wo);const before=clone(item),name=String(p.name??item.name).trim();if(!name)throw Error('กรุณาระบุชื่ออะไหล่');Object.assign(item,{name,qty:num(p.qty??item.qty)||1,unitCost:num(p.unitCost??item.unitCost)});audit('แก้ไขรายการอะไหล่',wo.id,before,clone(item));return item;}
  function deletePartItem(id){ensureState();const item=STATE.partItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการอะไหล่');const wo=workOrderById(item.workOrderId);assertCostMutable(wo);STATE.partItems.splice(STATE.partItems.indexOf(item),1);audit('ลบรายการอะไหล่',wo.id,clone(item),null);return true;}
  function addLabourItem(workOrderId,p){const wo=workOrderById(workOrderId);assertCostMutable(wo);const description=String(p.description||'').trim();if(!description)throw Error('กรุณาระบุรายละเอียดค่าแรง');const item={id:typeof uid==='function'?uid('LAB'):`LAB-${Date.now()}`,workOrderId:wo.id,description,hours:num(p.hours),rate:num(p.rate)};STATE.labourItems.push(item);audit('เพิ่มรายการค่าแรง',wo.id,null,clone(item));return item;}
  function editLabourItem(id,p){ensureState();const item=STATE.labourItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการค่าแรง');const wo=workOrderById(item.workOrderId);assertCostMutable(wo);const before=clone(item),description=String(p.description??item.description).trim();if(!description)throw Error('กรุณาระบุรายละเอียดค่าแรง');Object.assign(item,{description,hours:num(p.hours??item.hours),rate:num(p.rate??item.rate)});audit('แก้ไขรายการค่าแรง',wo.id,before,clone(item));return item;}
  function deleteLabourItem(id){ensureState();const item=STATE.labourItems.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบรายการค่าแรง');const wo=workOrderById(item.workOrderId);assertCostMutable(wo);STATE.labourItems.splice(STATE.labourItems.indexOf(item),1);audit('ลบรายการค่าแรง',wo.id,clone(item),null);return true;}
  function addExternalServiceCost(workOrderId,p){const wo=workOrderById(workOrderId);assertCostMutable(wo);const d=currentVendorDispatch(wo.id);if(wo.repairMode!=='external'||!d)throw Error('ต้องมีรายการส่งซ่อมภายนอกที่กำลังใช้งานก่อนบันทึกค่าใช้จ่ายอู่');const item={id:typeof uid==='function'?uid('ESC'):`ESC-${Date.now()}`,vendorDispatchId:d.id,invoiceNo:String(p.invoiceNo||'').trim(),amount:num(p.amount),note:String(p.note||'').trim()};STATE.externalServiceCosts.push(item);audit('เพิ่มค่าใช้จ่ายอู่ภายนอก',wo.id,null,clone(item));return item;}
  function externalCostContext(id){ensureState();const item=STATE.externalServiceCosts.find(x=>x&&x.id===id);if(!item)throw Error('ไม่พบค่าใช้จ่ายอู่ภายนอก');const d=STATE.vendorDispatches.find(x=>x&&x.id===item.vendorDispatchId);const wo=workOrderById(d?.workOrderId);return {item,d,wo};}
  function editExternalServiceCost(id,p){const {item,wo}=externalCostContext(id);assertCostMutable(wo);const before=clone(item);Object.assign(item,{invoiceNo:String(p.invoiceNo??item.invoiceNo??'').trim(),amount:num(p.amount??item.amount),note:String(p.note??item.note??'').trim()});audit('แก้ไขค่าใช้จ่ายอู่ภายนอก',wo.id,before,clone(item));return item;}
  function deleteExternalServiceCost(id){const {item,wo}=externalCostContext(id);assertCostMutable(wo);STATE.externalServiceCosts.splice(STATE.externalServiceCosts.indexOf(item),1);audit('ลบค่าใช้จ่ายอู่ภายนอก',wo.id,clone(item),null);return true;}
  function totalCostFor(workOrderId){const part=partsFor(workOrderId).reduce((s,x)=>s+num(x.qty)*num(x.unitCost),0);const labour=labourFor(workOrderId).reduce((s,x)=>s+num(x.hours)*num(x.rate),0);const ext=externalCostsFor(workOrderId).reduce((s,x)=>s+num(x.amount),0);return part+labour+ext;}
  function isOverBudget(workOrderId){const wo=workOrderById(workOrderId);if(!wo||wo.approvedAmount==null)return false;return totalCostFor(workOrderId)>num(wo.approvedAmount);}
  function saveOverBudgetNote(workOrderId,note){const wo=workOrderById(workOrderId);assertCostMutable(wo);const before=clone(wo);wo.overBudgetNote=String(note||'').trim();wo.updatedAt=ts();audit('บันทึกหมายเหตุเกินวงเงิน',wo.id,before,clone(wo));return wo;}

  const statusLabel=s=>({open:'เปิดงาน',in_progress:'กำลังซ่อม',pending_inspection:'รอตรวจรับ',cancelled:'ยกเลิก',closed:'ปิดงาน',dispatched:'ส่งซ่อมภายนอก'})[s]||s||'-';
  const typeLabel=s=>({repair:'ซ่อม',inspection:'ตรวจสอบ',service:'บำรุงรักษา'})[s]||s||'-';
  const assetLabelFor=id=>{const a=assetById(id);return a?(a.plate||a.code||a.name||'(ไม่มีทะเบียน)'):'-';};
  const requestLabel=id=>requestById(id)?.requestNo||'-';

  function filteredRows(){ensureState();const q=woSearch.trim().toLowerCase();return STATE.workOrders.filter(w=>{if(!w)return false;if(woStatus&&w.status!==woStatus)return false;if(!q)return true;return [w.workOrderNo,assetLabelFor(w.assetId),requestLabel(w.sourceRequestId),w.maintenanceType,statusLabel(w.status)].some(v=>String(v||'').toLowerCase().includes(q));});}
  function registryTableHtml(){
    const rows=filteredRows(),pages=Math.max(1,Math.ceil(rows.length/woPageSize));if(woPage>pages)woPage=pages;const start=(woPage-1)*woPageSize,list=rows.slice(start,start+woPageSize);
    const body=list.length?list.map(w=>`<tr data-wo-row="${esc(w.id)}"><td>${esc(w.workOrderNo||w.id)} ${w.legacyImported?'<span class="pill">Legacy</span>':''}</td><td>${esc(assetLabelFor(w.assetId))}</td><td>${w.sourceRequestId?`<button class="btn sm" data-wo-request="${esc(w.sourceRequestId)}">${esc(requestLabel(w.sourceRequestId))}</button>`:'-'}</td><td>${esc(typeLabel(w.maintenanceType))}</td><td><span class="pill">${esc(statusLabel(w.status))}</span></td><td>${esc(String(w.openedAt||w.createdAt||'-').slice(0,10))}</td><td><button class="btn sm" data-wo-open="${esc(w.id)}">เปิด</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">ยังไม่มีข้อมูล</div></td></tr>';
    return `<table><thead><tr><th>เลขที่</th><th>ทรัพย์สิน-ทะเบียน</th><th>ที่มา</th><th>ประเภทงาน</th><th>สถานะ</th><th>วันที่เปิด</th><th>จัดการ</th></tr></thead><tbody>${body}</tbody></table><div class="toolbar"><span class="muted">${rows.length} รายการ · หน้า ${woPage}/${pages}</span><div><select id="woPageSize">${[10,20,50].map(n=>`<option ${woPageSize===n?'selected':''}>${n}</option>`).join('')}</select> <button class="btn sm" id="woPrev" ${woPage<=1?'disabled':''}>ก่อนหน้า</button> <button class="btn sm" id="woNext" ${woPage>=pages?'disabled':''}>ถัดไป</button></div></div>`;
  }
  function workOrderRegistry(host){
    if(!canView()){if(host)host.innerHTML='<div class="panel"><div class="empty">บทบาทนี้ไม่มีสิทธิ์ดูงานซ่อม</div></div>';return '';}
    const html=`<div class="panel"><div class="toolbar"><div><h3>งานซ่อม</h3><div class="muted">Work Order Registry</div></div><div><input id="woSearch" placeholder="ค้นหา" value="${esc(woSearch)}"> <select id="woStatus"><option value="">ทุกสถานะ</option>${['open','dispatched','in_progress','pending_inspection','cancelled','closed'].map(s=>`<option value="${s}" ${woStatus===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select> <button class="btn" id="woClear">ล้าง</button></div></div><div id="woTableArea">${registryTableHtml()}</div></div>`;
    if(!host)return html;host.innerHTML=html;bindRegistry(host);return html;
  }
  function bindRegistry(host){
    const q=s=>host.querySelector?.(s),qa=(root,s)=>[...(root?.querySelectorAll?.(s)||[])];
    const renderTable=()=>{const area=q('#woTableArea');if(!area)return;area.innerHTML=registryTableHtml();bindTable(area);};
    const bindTable=area=>{
      const aq=s=>area.querySelector?.(s);
      if(aq('#woPageSize'))aq('#woPageSize').onchange=e=>{woPageSize=Number(e.target.value)||20;woPage=1;renderTable();};
      if(aq('#woPrev'))aq('#woPrev').onclick=()=>{woPage=Math.max(1,woPage-1);renderTable();};
      if(aq('#woNext'))aq('#woNext').onclick=()=>{woPage++;renderTable();};
      qa(area,'[data-wo-open]').forEach(b=>b.onclick=e=>{e.stopPropagation?.();workOrderDetail(b.dataset.woOpen);});
      qa(area,'[data-wo-request]').forEach(b=>b.onclick=e=>{e.stopPropagation?.();openRequest(b.dataset.woRequest);});
      qa(area,'[data-wo-row]').forEach(tr=>tr.onclick=()=>workOrderDetail(tr.dataset.woRow));
    };
    const search=q('#woSearch'),status=q('#woStatus'),clear=q('#woClear'),area=q('#woTableArea');
    if(search)search.oninput=e=>{woSearch=e.target.value;woPage=1;renderTable();};
    if(status)status.onchange=e=>{woStatus=e.target.value;woPage=1;renderTable();};
    if(clear)clear.onclick=()=>{woSearch='';woStatus='';woPage=1;if(search)search.value='';if(status)status.value='';renderTable();};
    if(area)bindTable(area);
  }

  function auditHtml(id){const rows=(STATE.audit||[]).filter(a=>a&&a.entity==='workOrder'&&a.recordId===id).slice().reverse();return rows.length?`<table><thead><tr><th>เวลา</th><th>รายการ</th><th>ผู้ทำ</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.ts||'-')}</td><td>${esc(a.action||'-')}</td><td>${esc(a.user||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีประวัติ</div>';}
  function costPanelHtml(wo,cancelled){
    const parts=partsFor(wo.id),labours=labourFor(wo.id),external=externalCostsFor(wo.id),editable=canManage()&&!cancelled;
    const partTotal=parts.reduce((s,x)=>s+num(x.qty)*num(x.unitCost),0),labourTotal=labours.reduce((s,x)=>s+num(x.hours)*num(x.rate),0),externalTotal=external.reduce((s,x)=>s+num(x.amount),0),total=partTotal+labourTotal+externalTotal;
    const partRows=parts.length?parts.map(x=>`<tr><td>${esc(x.name||'-')}</td><td>${esc(x.qty??1)}</td><td>฿${money(x.unitCost)}</td><td>฿${money(num(x.qty)*num(x.unitCost))}</td><td>${editable?`<button class="btn sm" data-part-edit="${esc(x.id)}">แก้ไข</button> <button class="btn sm" data-part-delete="${esc(x.id)}">ลบ</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">ยังไม่มีรายการอะไหล่</div></td></tr>';
    const labourRows=labours.length?labours.map(x=>`<tr><td>${esc(x.description||'-')}</td><td>${esc(x.hours??0)}</td><td>฿${money(x.rate)}</td><td>฿${money(num(x.hours)*num(x.rate))}</td><td>${editable?`<button class="btn sm" data-labour-edit="${esc(x.id)}">แก้ไข</button> <button class="btn sm" data-labour-delete="${esc(x.id)}">ลบ</button>`:'-'}</td></tr>`).join(''):'<tr><td colspan="5"><div class="empty">ยังไม่มีรายการค่าแรง</div></td></tr>';
    const extRows=external.length?external.map(x=>{const d=STATE.vendorDispatches.find(v=>v.id===x.vendorDispatchId),v=vendorById(d?.vendorId);return `<tr><td>${esc(v?.name||'-')}</td><td>${esc(x.invoiceNo||'-')}</td><td>฿${money(x.amount)}</td><td>${esc(x.note||'-')}</td><td>${editable?`<button class="btn sm" data-ext-edit="${esc(x.id)}">แก้ไข</button> <button class="btn sm" data-ext-delete="${esc(x.id)}">ลบ</button>`:'-'}</td></tr>`;}).join(''):'<tr><td colspan="5"><div class="empty">ยังไม่มีค่าซ่อมภายนอก</div></td></tr>';
    const extBlock=wo.repairMode==='external'?`<div style="margin-top:16px"><div class="toolbar"><h4>ค่าซ่อมภายนอก</h4>${editable&&currentVendorDispatch(wo.id)?'<button class="btn sm primary" id="woAddExternalCost">+ เพิ่มค่าซ่อมภายนอก</button>':''}</div><table><thead><tr><th>อู่</th><th>ใบแจ้งหนี้</th><th>จำนวนเงิน</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>${extRows}</tbody></table><div class="muted" style="text-align:right">รวมค่าซ่อมภายนอก: ฿${money(externalTotal)}</div></div>`:'';
    const budget=isOverBudget(wo.id)?`<div style="margin-top:14px"><span class="pill danger">เกินวงเงินอนุมัติ</span><div class="muted">วงเงินอนุมัติ ฿${money(wo.approvedAmount)} · เกิน ฿${money(total-num(wo.approvedAmount))}</div>${editable?`<label class="wide" style="margin-top:8px">หมายเหตุเกินวงเงิน<textarea id="woOverBudgetNote">${esc(wo.overBudgetNote||'')}</textarea></label><button class="btn sm" id="woSaveOverBudgetNote">บันทึกหมายเหตุ</button>`:`<div>${esc(wo.overBudgetNote||'-')}</div>`}</div>`:'';
    return `<div><div class="toolbar"><h4>อะไหล่</h4>${editable?'<button class="btn sm primary" id="woAddPart">+ เพิ่มอะไหล่</button>':''}</div><table><thead><tr><th>รายการ</th><th>จำนวน</th><th>ราคาต่อหน่วย</th><th>รวม</th><th>จัดการ</th></tr></thead><tbody>${partRows}</tbody></table><div class="muted" style="text-align:right">รวมอะไหล่: ฿${money(partTotal)}</div></div><div style="margin-top:16px"><div class="toolbar"><h4>ค่าแรง</h4>${editable?'<button class="btn sm primary" id="woAddLabour">+ เพิ่มค่าแรง</button>':''}</div><table><thead><tr><th>รายละเอียด</th><th>ชั่วโมง</th><th>อัตรา</th><th>รวม</th><th>จัดการ</th></tr></thead><tbody>${labourRows}</tbody></table><div class="muted" style="text-align:right">รวมค่าแรง: ฿${money(labourTotal)}</div></div>${extBlock}<div style="margin-top:16px;text-align:right"><b>ยอดรวมทั้งหมด: ฿${money(total)}</b></div>${budget}`;
  }
  function dispatchHistoryHtml(wo){
    const rows=dispatchesFor(wo.id).slice().sort((a,b)=>num(b.sequence)-num(a.sequence));if(!rows.length&&wo.repairMode!=='external')return '';
    const body=rows.length?rows.map(d=>`<tr><td>${esc(d.sequence||'-')}</td><td>${esc(vendorById(d.vendorId)?.name||'-')}</td><td>${esc(d.dispatchedAt||'-')}</td><td>${esc(d.receivedAt||'-')}</td><td><span class="pill">${esc(({active:'กำลังซ่อม',received:'รับคืนแล้ว',cancelled:'ยกเลิก'})[d.status]||d.status||'-')}</span></td><td>${esc(d.reason||'-')}</td></tr>`).join(''):'<tr><td colspan="6"><div class="empty">ยังไม่มีประวัติการส่งซ่อม</div></td></tr>';
    return `<div class="panel"><h3>ประวัติการส่งซ่อม</h3><table><thead><tr><th>ครั้งที่</th><th>ผู้ให้บริการ</th><th>วันที่ส่ง</th><th>วันที่รับคืน</th><th>สถานะ</th><th>เหตุผล</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function workOrderDetail(id){
    if(!canView())throw Error('บทบาทนี้ไม่มีสิทธิ์ดู Work Order');const wo=workOrderById(id);if(!wo)throw Error('ไม่พบ Work Order');const items=itemsFor(id),cancelled=wo.status==='cancelled';
    const sourceRequest=wo.sourceRequestId?requestById(wo.sourceRequestId):null;
    const urgencyText=s=>({low:'ต่ำ',normal:'ปกติ',high:'สูง',critical:'เร่งด่วนมาก'})[s]||s||'-';
    const sourceHtml=wo.sourceRequestId?(sourceRequest?`<div class="grid3"><div><b>เลขที่คำขอ</b><br>${esc(sourceRequest.requestNo||'-')}</div><div><b>วันที่แจ้ง</b><br>${esc(sourceRequest.requestDate||'-')}</div><div><b>ผู้แจ้ง</b><br>${esc(sourceRequest.requesterNameSnapshot||'-')}</div><div><b>ความเร่งด่วน</b><br>${esc(urgencyText(sourceRequest.urgency))}</div><div><b>ผู้ให้บริการที่เสนอ</b><br>${esc(sourceRequest.proposedVendorNameSnapshot||'-')}</div><div><b>ประมาณการ</b><br>฿${money(sourceRequest.estimatedCost)}</div></div><div style="margin-top:10px"><b>อาการ/เหตุผล</b><br>${esc(sourceRequest.issue||'-')}</div><div style="margin-top:12px"><button class="btn sm" id="woSourceRequest">เปิดดูคำขอเต็ม</button></div>`:`<div class="muted">ไม่พบข้อมูลคำขอต้นทาง</div><div style="margin-top:12px"><button class="btn sm" id="woSourceRequest">${esc(requestLabel(wo.sourceRequestId))}</button></div>`):'<div class="muted">ข้อมูลเดิม / ไม่มีคำขอต้นทาง</div>';
    const rawAsset=assetById(wo.assetId),asset=rawAsset&&!rawAsset.deleted?rawAsset:null;
    const assetHtml=asset?(()=>{const meterUnit=asset.meterUnit||'';const openMeter=wo.odometerAtOpen??'-',currentMeter=asset.mileage??'-';const company=typeof coName==='function'?coName(asset.companyId):(asset.companyName||'-');const unit=typeof ouName==='function'?ouName(asset.managingOperatingUnitId):(asset.unitName||'-');const category=({vehicle:'รถยนต์/ยานพาหนะ',machinery:'เครื่องจักร',equipment:'อุปกรณ์'})[asset.assetCategory]||'-';const resolvedResponsible=typeof personName==='function'&&asset.responsiblePersonId?personName(asset.responsiblePersonId):'-';const responsible=resolvedResponsible&&resolvedResponsible!=='-'?resolvedResponsible:(asset.responsibleText||'-');return `<div class="grid3"><div><b>รหัส/ทะเบียน</b><br>${esc(asset.code||'-')} · ${esc(asset.plate||'(ไม่มีทะเบียน)')}</div><div><b>ยี่ห้อ/รุ่น</b><br>${esc([asset.brandName,asset.modelName].filter(Boolean).join(' ')||'-')}</div><div><b>เลขไมล์/ชั่วโมง</b><br>ตอนเปิดงาน: ${esc(openMeter)}${meterUnit?` ${esc(meterUnit)}`:''} · ปัจจุบัน: ${esc(currentMeter)}${meterUnit?` ${esc(meterUnit)}`:''}</div><div><b>บริษัท</b><br>${esc(company||'-')}</div><div><b>หน่วยดูแล</b><br>${esc(unit||'-')}</div><div><b>ประเภท</b><br>${esc(category)}</div><div><b>ผู้ดูแล</b><br>${esc(responsible)}</div></div>`;})():'<div class="muted">ไม่พบข้อมูลทรัพย์สิน</div>';
    setHead?.(`Work Order ${wo.workOrderNo||''}`,'Job Center');
    const actions=canManage()&&!cancelled?`${wo.status==='open'?'<button class="btn primary" id="woStart">เริ่มซ่อม</button><button class="btn" id="woDispatch">ส่งซ่อมอู่ภายนอก</button>':''}${wo.status==='dispatched'?'<button class="btn primary" id="woReceive">รับคืนจากอู่</button><button class="btn" id="woChangeVendor">เปลี่ยนอู่</button>':''}${wo.status==='in_progress'?'<button class="btn primary" id="woFinish">แจ้งซ่อมเสร็จ</button>':''}${canCancel()?'<button class="btn danger" id="woCancel">ยกเลิกงาน</button>':''}`:'';
    content.innerHTML=`<button class="btn" id="woBack">← กลับงานซ่อม</button><div class="panel"><div class="toolbar"><div><h2>${esc(wo.workOrderNo||wo.id)} ${wo.legacyImported?'<span class="pill">Legacy</span>':''}</h2><div>${esc(assetLabelFor(wo.assetId))} · <span class="pill">${esc(statusLabel(wo.status))}</span></div></div><div>${actions}</div></div></div><div class="panel"><h3>ที่มา</h3>${sourceHtml}</div><div class="panel"><h3>ข้อมูลทรัพย์สิน</h3>${assetHtml}</div><div class="panel"><div class="toolbar"><h3>รายการซ่อม</h3>${canManage()&&!cancelled?'<button class="btn primary" id="woAddItem">+ เพิ่มรายการ</button>':''}</div><table><thead><tr><th>เสร็จ</th><th>หมวด</th><th>รายละเอียด</th><th>จำนวน</th><th>จัดการ</th></tr></thead><tbody>${items.map(i=>`<tr><td><input type="checkbox" data-ri-toggle="${esc(i.id)}" ${i.status==='done'?'checked':''} ${canManage()&&!cancelled?'':'disabled'}></td><td>${esc(i.category||'-')}</td><td>${esc(i.description||'-')}</td><td>${esc(i.qty??1)}</td><td>${canManage()&&!cancelled?`<button class="btn sm" data-ri-edit="${esc(i.id)}">แก้ไข</button> <button class="btn sm" data-ri-delete="${esc(i.id)}">ลบ</button>`:'-'}</td></tr>`).join('')}</tbody></table></div><div class="panel"><h3>ค่าใช้จ่าย</h3>${costPanelHtml(wo,cancelled)}</div>${dispatchHistoryHtml(wo)}<div class="panel"><h3>ประวัติ / Audit</h3>${auditHtml(id)}</div>`;
    bindDetail(wo);return wo;
  }

  function vendorOptions(selected=''){return activeVendors().map(v=>`<option value="${esc(v.id)}" ${v.id===selected?'selected':''}>${esc(v.name||v.code||v.id)}</option>`).join('');}
  function bindDetail(wo){
    if($('#woBack'))$('#woBack').onclick=()=>{const host=content;workOrderRegistry(host)};
    if($('#woSourceRequest'))$('#woSourceRequest').onclick=()=>openRequest(wo.sourceRequestId);
    if($('#woStart'))$('#woStart').onclick=()=>{try{transition(wo.id,'in_progress');workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woFinish'))$('#woFinish').onclick=()=>{try{transition(wo.id,'pending_inspection');workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woCancel'))$('#woCancel').onclick=()=>formModal('ยกเลิก Work Order','<label class="wide">เหตุผลการยกเลิก<textarea name="reason" required></textarea></label>',p=>{const x=cancelWorkOrder(wo.id,p.reason);setTimeout(()=>workOrderDetail(wo.id),0);return x});
    if($('#woDispatch'))$('#woDispatch').onclick=()=>formModal('ส่งซ่อมอู่ภายนอก',`<label class="wide">ผู้ให้บริการ<select name="vendorId" required><option value="">-- เลือก --</option>${vendorOptions()}</select></label>`,p=>{const x=dispatchExternal(wo.id,p.vendorId);setTimeout(()=>workOrderDetail(wo.id),0);return x});
    if($('#woReceive'))$('#woReceive').onclick=()=>{try{receiveFromVendor(wo.id);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    if($('#woChangeVendor'))$('#woChangeVendor').onclick=()=>formModal('เปลี่ยนอู่ซ่อม',`<label class="wide">ผู้ให้บริการใหม่<select name="vendorId" required><option value="">-- เลือก --</option>${vendorOptions()}</select></label><label class="wide">เหตุผลการเปลี่ยนอู่<textarea name="reason" required></textarea></label>`,p=>{const x=changeVendor(wo.id,p.vendorId,p.reason);setTimeout(()=>workOrderDetail(wo.id),0);return x});
    if($('#woAddItem'))$('#woAddItem').onclick=()=>repairItemForm(wo.id);
    if($('#woAddPart'))$('#woAddPart').onclick=()=>partForm(wo.id);
    if($('#woAddLabour'))$('#woAddLabour').onclick=()=>labourForm(wo.id);
    if($('#woAddExternalCost'))$('#woAddExternalCost').onclick=()=>externalCostForm(wo.id);
    if($('#woSaveOverBudgetNote'))$('#woSaveOverBudgetNote').onclick=()=>{try{saveOverBudgetNote(wo.id,$('#woOverBudgetNote')?.value||'');workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};
    $$('[data-ri-edit]').forEach(b=>b.onclick=()=>repairItemForm(wo.id,b.dataset.riEdit));$$('[data-ri-delete]').forEach(b=>b.onclick=()=>{try{deleteRepairItem(b.dataset.riDelete);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});$$('[data-ri-toggle]').forEach(b=>b.onchange=()=>{try{toggleRepairItem(b.dataset.riToggle,b.checked);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});
    $$('[data-part-edit]').forEach(b=>b.onclick=()=>partForm(wo.id,b.dataset.partEdit));$$('[data-part-delete]').forEach(b=>b.onclick=()=>{try{deletePartItem(b.dataset.partDelete);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});
    $$('[data-labour-edit]').forEach(b=>b.onclick=()=>labourForm(wo.id,b.dataset.labourEdit));$$('[data-labour-delete]').forEach(b=>b.onclick=()=>{try{deleteLabourItem(b.dataset.labourDelete);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});
    $$('[data-ext-edit]').forEach(b=>b.onclick=()=>externalCostForm(wo.id,b.dataset.extEdit));$$('[data-ext-delete]').forEach(b=>b.onclick=()=>{try{deleteExternalServiceCost(b.dataset.extDelete);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}});
  }
  function repairItemForm(workOrderId,itemId=''){const wo=workOrderById(workOrderId);assertItemMutable(wo);const old=itemId?STATE.repairItems.find(x=>x&&x.id===itemId):null;if(itemId&&!old)throw Error('ไม่พบรายการซ่อม');const html=`<label class="wide">รายละเอียด<input name="description" required value="${esc(old?.description||'')}"></label><label>หมวด<input name="category" value="${esc(old?.category||wo.maintenanceType||'repair')}"></label><label>จำนวน<input type="number" min="0.01" step="0.01" name="qty" value="${esc(old?.qty??1)}"></label>`;formModal(old?'แก้ไขรายการซ่อม':'เพิ่มรายการซ่อม',html,p=>{const x=old?editRepairItem(old.id,p):addRepairItem(workOrderId,p);setTimeout(()=>workOrderDetail(workOrderId),0);return x;});}
  function partForm(workOrderId,itemId=''){const wo=workOrderById(workOrderId);assertCostMutable(wo);const old=itemId?STATE.partItems.find(x=>x&&x.id===itemId):null;if(itemId&&!old)throw Error('ไม่พบรายการอะไหล่');formModal(old?'แก้ไขอะไหล่':'เพิ่มอะไหล่',`<label class="wide">รายการ<input name="name" required value="${esc(old?.name||'')}"></label><label>จำนวน<input type="number" min="0.01" step="0.01" name="qty" value="${esc(old?.qty??1)}"></label><label>ราคาต่อหน่วย<input type="number" min="0" step="0.01" name="unitCost" value="${esc(old?.unitCost??0)}"></label>`,p=>{const x=old?editPartItem(old.id,p):addPartItem(workOrderId,p);setTimeout(()=>workOrderDetail(workOrderId),0);return x;});}
  function labourForm(workOrderId,itemId=''){const wo=workOrderById(workOrderId);assertCostMutable(wo);const old=itemId?STATE.labourItems.find(x=>x&&x.id===itemId):null;if(itemId&&!old)throw Error('ไม่พบรายการค่าแรง');formModal(old?'แก้ไขค่าแรง':'เพิ่มค่าแรง',`<label class="wide">รายละเอียด<input name="description" required value="${esc(old?.description||'')}"></label><label>ชั่วโมง<input type="number" min="0" step="0.01" name="hours" value="${esc(old?.hours??0)}"></label><label>อัตราต่อชั่วโมง<input type="number" min="0" step="0.01" name="rate" value="${esc(old?.rate??0)}"></label>`,p=>{const x=old?editLabourItem(old.id,p):addLabourItem(workOrderId,p);setTimeout(()=>workOrderDetail(workOrderId),0);return x;});}
  function externalCostForm(workOrderId,itemId=''){const wo=workOrderById(workOrderId);assertCostMutable(wo);const old=itemId?STATE.externalServiceCosts.find(x=>x&&x.id===itemId):null;if(itemId&&!old)throw Error('ไม่พบค่าใช้จ่ายอู่ภายนอก');if(!old&&!currentVendorDispatch(workOrderId))throw Error('ไม่พบอู่ที่กำลังซ่อม');formModal(old?'แก้ไขค่าซ่อมภายนอก':'เพิ่มค่าซ่อมภายนอก',`<label>เลขที่ใบแจ้งหนี้<input name="invoiceNo" value="${esc(old?.invoiceNo||'')}"></label><label>จำนวนเงิน<input type="number" min="0" step="0.01" name="amount" required value="${esc(old?.amount??0)}"></label><label class="wide">หมายเหตุ<textarea name="note">${esc(old?.note||'')}</textarea></label>`,p=>{const x=old?editExternalServiceCost(old.id,p):addExternalServiceCost(workOrderId,p);setTimeout(()=>workOrderDetail(workOrderId),0);return x;});}

  function openRequest(id){if(capturedRequestDetail)return capturedRequestDetail(id);return requestApi?.requestDetail?.(id);}
  function appendCreateButton(requestId){activeRequestId=requestId;if(!approved(requestId)||!canManage())return false;if(content?.querySelector?.('#woCreatePanel'))return false;const html=`<div class="panel" id="woCreatePanel"><div class="toolbar"><div><h3>Work Order</h3><div class="muted">คำขอนี้ได้รับอนุมัติแล้ว สามารถสร้าง Work Order ได้มากกว่า 1 ใบ</div></div><button class="btn primary" id="woCreateFromRequest">สร้าง Work Order</button></div></div>`;content.insertAdjacentHTML?content.insertAdjacentHTML('beforeend',html):content.innerHTML+=html;const b=$('#woCreateFromRequest');if(b)b.onclick=()=>{try{const wo=createFromRequest(requestId);workOrderDetail(wo.id)}catch(e){toast(e.message||String(e),true)}};return true;}
  function wrappedRequestDetail(id){activeRequestId=id;if(capturedRequestDetail)capturedRequestDetail(id);appendCreateButton(id);}
  function restoreCreateButton(){if(!activeRequestId||!content?.querySelector)return false;if(content.querySelector('#woCreatePanel'))return false;if(!content.querySelector('#apdPanels'))return false;return appendCreateButton(activeRequestId);}
  function captureRequestRowNavigation(e){const t=e?.target;if(t?.closest?.('[data-mr-edit],[data-mr-cancel]'))return false;const row=t?.closest?.('[data-mr-row]'),id=row?.dataset?.mrRow;if(!id)return false;activeRequestId=id;if(typeof setTimeout==='function')setTimeout(()=>restoreCreateButton(),0);return true;}
  let observer=null;if(typeof MutationObserver==='function'&&content){observer=new MutationObserver(()=>restoreCreateButton());observer.observe(content,{childList:true,subtree:true});}
  if(requestApi&&capturedRequestDetail)requestApi.requestDetail=wrappedRequestDetail;
  if(typeof window!=='undefined'&&window?.addEventListener)window.addEventListener('click',captureRequestRowNavigation,true);

  window.FLEET_MAINTENANCE_WORKORDER_API={workOrderRegistry,workOrderDetail,hasWorkOrderFor,createFromRequest,totalCostFor,isOverBudget};
  window.FLEET_MAINTENANCE_WORKORDER_TEST={ensureState,approved,approvalResult,nextWorkOrderNo,createFromRequest,transition,cancelWorkOrder,addRepairItem,editRepairItem,deleteRepairItem,toggleRepairItem,itemsFor,hasWorkOrderFor,filteredRows,workOrderRegistry,workOrderDetail,appendCreateButton,wrappedRequestDetail,restoreCreateButton,captureRequestRowNavigation,getActiveRequestId:()=>activeRequestId,canView,canManage,canCancel,statusLabel,auditHtml,activeVendors,vendorById,dispatchesFor,currentVendorDispatch,dispatchExternal,receiveFromVendor,changeVendor,partsFor,labourFor,externalCostsFor,addPartItem,editPartItem,deletePartItem,addLabourItem,editLabourItem,deleteLabourItem,addExternalServiceCost,editExternalServiceCost,deleteExternalServiceCost,totalCostFor,isOverBudget,saveOverBudgetNote};
})();