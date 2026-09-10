/* Maintenance Workflow v1 — Batch 4: MaintenanceRequest CRUD.
   Additive-only. No approval workflow or WorkOrder creation in this batch. */
(function(){
  let requestPage=1;
  let requestPageSize=20;
  const norm=s=>String(s??'').trim().toLowerCase();
  const role=()=>typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'';
  const knownRoles=new Set(['admin','manager','fleetOfficer','clerk','requester','viewer']);
  const canView=()=>knownRoles.has(role());
  const canCreate=()=>['admin','manager','fleetOfficer','requester'].includes(role());
  const canEdit=()=>['admin','manager','fleetOfficer'].includes(role());
  const canCancel=()=>['admin','manager','fleetOfficer'].includes(role());
  const actor=()=>{
    const r=role();
    if(!r)return '';
    const account=(STATE?.userAccounts||[]).find(x=>x&&x.role===r&&x.active!==false);
    return account?.personId||r;
  };
  const actorPersonId=()=>{
    const r=role();
    if(!r)return '';
    return (STATE?.userAccounts||[]).find(x=>x&&x.role===r&&x.active!==false)?.personId||'';
  };

  function ensureRequestState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.maintenanceRequests??=[];
    STATE.workOrders??=[];
    STATE.vendors??=[];
    STATE.people??=[];
    STATE.assets??=[];
    STATE.audit??=[];
  }

  function activeVendors(){
    ensureRequestState();
    return STATE.vendors.filter(v=>v&&v.active===true&&v.deleted===false);
  }
  function activeAssets(){
    ensureRequestState();
    return STATE.assets.filter(a=>a&&!a.deleted);
  }
  function vendorById(id){ensureRequestState();return STATE.vendors.find(v=>v&&v.id===id)||null;}
  function assetById(id){ensureRequestState();return STATE.assets.find(a=>a&&a.id===id&&!a.deleted)||null;}
  function personById(id){ensureRequestState();return STATE.people.find(p=>p&&p.id===id&&p.active!==false)||null;}

  function nextRequestNo(){
    ensureRequestState();
    let max=0;
    const used=new Set();
    for(const r of STATE.maintenanceRequests){
      const no=String(r?.requestNo||'');used.add(no);
      const m=no.match(/^MR-(\d+)$/i);if(m)max=Math.max(max,Number(m[1])||0);
    }
    let n=max+1,no;
    do{no=`MR-${String(n++).padStart(4,'0')}`;}while(used.has(no));
    return no;
  }

  function hasWorkOrder(request){
    ensureRequestState();
    return (STATE.workOrders||[]).some(wo=>wo&&wo.sourceRequestId===request.id&&wo.status!=='cancelled');
  }
  function workOrderBadge(request){
    const yes=hasWorkOrder(request);
    return `<span class="pill ${yes?'ok':'warn'}">${yes?'มีแล้ว':'ยังไม่มี'}</span>`;
  }
  function statusLabel(s){return s==='cancelled'?'ยกเลิก':'ร่าง';}
  function urgencyLabel(s){return ({low:'ต่ำ',normal:'ปกติ',high:'สูง',critical:'เร่งด่วนมาก'})[s]||s||'-';}
  function typeLabel(s){return ({repair:'ซ่อม',inspection:'ตรวจสอบ',service:'บำรุงรักษา'})[s]||s||'-';}
  function assetLabelFor(a){if(!a)return '-';return [a.code,a.plate].filter(Boolean).join(' · ')||a.id||'-';}

  function validateVendor(id){
    const vendorId=String(id||'').trim();
    if(!vendorId)return null;
    const v=STATE.vendors.find(x=>x&&x.id===vendorId&&x.active===true&&x.deleted===false)||null;
    if(!v)throw Error('ผู้ให้บริการที่เลือกไม่พร้อมใช้งาน กรุณาเลือกใหม่');
    return v;
  }

  function normalizeAttachments(value){return Array.isArray(value)?value:[];}
  async function readSelectedFiles(){
    const input=typeof dialog!=='undefined'&&dialog?.querySelector?dialog.querySelector('[name=requestAttachments]'):null;
    const files=[...(input?.files||[])];
    if(!files.length)return [];
    const read=file=>new Promise((resolve,reject)=>{
      const fr=new FileReader();fr.onload=()=>resolve({id:uid('ATT'),name:file.name,type:file.type||'',size:Number(file.size)||0,data:String(fr.result||''),createdAt:now()});fr.onerror=()=>reject(fr.error||Error('อ่านไฟล์ไม่สำเร็จ'));fr.readAsDataURL(file);
    });
    return Promise.all(files.map(read));
  }

  function audit(action,id,before,after){
    if(typeof pAudit!=='function')throw Error('Audit service ไม่พร้อมใช้งาน');
    pAudit(action,'maintenanceRequest',id,before,after);
  }

  function buildRequestPayload(p,old=null,extraAttachments=[]){
    ensureRequestState();
    const assetId=String(p.assetId||'').trim();
    const asset=assetById(assetId);if(!asset)throw Error('กรุณาเลือกทรัพย์สินที่ใช้งานอยู่');
    const vendor=validateVendor(p.proposedVendorId);
    let requesterId=String(p.requesterId||'').trim();
    let requesterName=String(p.requesterName||'').trim();
    if(role()==='requester'){
      const own=actorPersonId();
      if(own){requesterId=own;requesterName=personById(own)?.name||requesterName;}
      else requesterId='';
    }
    const person=requesterId?personById(requesterId):null;
    if(requesterId&&!person)throw Error('ไม่พบข้อมูลผู้แจ้งที่เลือก');
    const requesterNameSnapshot=String(person?.name||requesterName||'').trim();
    if(!requesterNameSnapshot)throw Error('กรุณาระบุผู้แจ้ง');
    const issue=String(p.issue||'').trim();if(!issue)throw Error('กรุณาระบุปัญหา/อาการ');
    const requestDate=String(p.requestDate||'').trim();if(!requestDate)throw Error('กรุณาระบุวันที่แจ้ง');
    const maintenanceType=String(p.maintenanceType||'repair');
    const urgency=String(p.urgency||'normal');
    const meterRaw=String(p.meterValue??'').trim();
    const estimatedRaw=String(p.estimatedCost??'').trim();
    return {
      assetId,requestDate,requesterId,
      requesterNameSnapshot,issue,maintenanceType,urgency,
      meterValue:meterRaw===''?'':Number(meterRaw),
      proposedVendorId:vendor?.id||'',
      proposedVendorNameSnapshot:vendor?.name||'',
      estimatedCost:estimatedRaw===''?0:Number(estimatedRaw)||0,
      requestNote:String(p.requestNote||'').trim(),
      attachments:[...normalizeAttachments(old?.attachments),...extraAttachments]
    };
  }

  function createRequest(p,extraAttachments=[]){
    if(!canCreate())throw Error('บทบาทนี้ไม่มีสิทธิ์สร้างคำขอซ่อม');
    ensureRequestState();
    const payload=buildRequestPayload(p,null,extraAttachments);
    const ts=now(),by=actor();
    const x={id:uid('MR'),requestNo:nextRequestNo(),...payload,status:'draft',createdAt:ts,updatedAt:ts,createdBy:by,updatedBy:by};
    STATE.maintenanceRequests.push(x);
    audit('สร้างคำขอซ่อม',x.id,null,structuredClone(x));
    return x;
  }

  function editRequest(id,p,extraAttachments=[]){
    if(!canEdit())throw Error('บทบาทนี้ไม่มีสิทธิ์แก้ไขคำขอซ่อม');
    ensureRequestState();
    const x=STATE.maintenanceRequests.find(r=>r&&r.id===id);if(!x)throw Error('ไม่พบคำขอซ่อม');
    if(x.status!=='draft')throw Error('แก้ไขได้เฉพาะคำขอที่เป็นร่าง');
    const before=structuredClone(x),payload=buildRequestPayload(p,x,extraAttachments);
    Object.assign(x,payload,{updatedAt:now(),updatedBy:actor()});
    audit('แก้ไขคำขอซ่อม',x.id,before,structuredClone(x));
    return x;
  }

  function cancelRequest(id){
    if(!canCancel())throw Error('บทบาทนี้ไม่มีสิทธิ์ยกเลิกคำขอซ่อม');
    ensureRequestState();
    const x=STATE.maintenanceRequests.find(r=>r&&r.id===id);if(!x)throw Error('ไม่พบคำขอซ่อม');
    if(x.status!=='draft')throw Error('ยกเลิกได้เฉพาะคำขอที่เป็นร่าง');
    const before=structuredClone(x);x.status='cancelled';x.updatedAt=now();x.updatedBy=actor();
    audit('ยกเลิกคำขอซ่อม',x.id,before,structuredClone(x));
    return x;
  }

  function peopleOptions(selected=''){
    ensureRequestState();
    return '<option value="">- กรอกชื่อผู้แจ้งเอง -</option>'+STATE.people.filter(p=>p&&p.active!==false).map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(selected)?'selected':''}>${esc(p.name||p.code||p.id)}</option>`).join('');
  }
  function assetOptions(selected=''){
    return '<option value="">- เลือกทรัพย์สิน -</option>'+activeAssets().map(a=>`<option value="${esc(a.id)}" ${String(a.id)===String(selected)?'selected':''}>${esc(assetLabelFor(a))}</option>`).join('');
  }
  function vendorOptions(selected=''){
    return '<option value="">- ไม่ระบุผู้ให้บริการ -</option>'+activeVendors().map(v=>`<option value="${esc(v.id)}" ${String(v.id)===String(selected)?'selected':''}>${esc(`${v.type==='internal'?'[ภายใน]':'[ภายนอก]'} ${v.name}`)}</option>`).join('');
  }

  function requestForm(id=''){
    if(id){if(!canEdit())return toast('บทบาทนี้ไม่มีสิทธิ์แก้ไขคำขอซ่อม',true);}else if(!canCreate())return toast('บทบาทนี้ไม่มีสิทธิ์สร้างคำขอซ่อม',true);
    ensureRequestState();
    const old=id?STATE.maintenanceRequests.find(r=>r&&r.id===id):null;
    if(id&&!old)return toast('ไม่พบคำขอซ่อม',true);
    if(old&&old.status!=='draft')return toast('แก้ไขได้เฉพาะคำขอที่เป็นร่าง',true);
    const ownPerson=role()==='requester'?actorPersonId():'';
    const requesterId=ownPerson||old?.requesterId||'';
    const requesterName=ownPerson?(personById(ownPerson)?.name||old?.requesterNameSnapshot||''):(old?.requesterId?'':old?.requesterNameSnapshot||'');
    const html=`
      <div class="wide"><h3>A. ข้อมูลคำขอ</h3></div>
      <label>วันที่แจ้ง<input name="requestDate" type="date" required value="${esc(old?.requestDate||today())}"></label>
      <label>ผู้แจ้ง<select name="requesterId" ${ownPerson?'disabled':''}>${peopleOptions(requesterId)}</select>${ownPerson?`<input type="hidden" name="requesterId" value="${esc(ownPerson)}">`:''}</label>
      <label>ชื่อผู้แจ้ง (กรณีไม่มีในทะเบียน)<input name="requesterName" value="${esc(requesterName)}" ${ownPerson?'readonly':''}></label>
      <label>ความเร่งด่วน<select name="urgency"><option value="low" ${old?.urgency==='low'?'selected':''}>ต่ำ</option><option value="normal" ${!old||old.urgency==='normal'?'selected':''}>ปกติ</option><option value="high" ${old?.urgency==='high'?'selected':''}>สูง</option><option value="critical" ${old?.urgency==='critical'?'selected':''}>เร่งด่วนมาก</option></select></label>
      <label>ประเภทงาน<select name="maintenanceType"><option value="repair" ${!old||old.maintenanceType==='repair'?'selected':''}>ซ่อม</option><option value="inspection" ${old?.maintenanceType==='inspection'?'selected':''}>ตรวจสอบ</option><option value="service" ${old?.maintenanceType==='service'?'selected':''}>บำรุงรักษา</option></select></label>
      <div class="wide"><h3>B. รถ/เครื่องจักร</h3></div>
      <label>ทรัพย์สิน<select name="assetId" required>${assetOptions(old?.assetId||'')}</select></label>
      <div class="wide notice-row" id="mrAssetInfo"><span>เลือกทรัพย์สินเพื่อดูข้อมูล</span></div>
      <label>เลขไมล์/ชั่วโมง<input name="meterValue" type="number" step="0.01" value="${esc(old?.meterValue??'')}"></label>
      <div class="wide muted" id="mrMeterWarn"></div>
      <div class="wide"><h3>C. ปัญหา/อาการ</h3></div>
      <label class="wide">ปัญหา/อาการ<textarea name="issue" required>${esc(old?.issue||'')}</textarea></label>
      <label class="wide">หมายเหตุคำขอ<textarea name="requestNote">${esc(old?.requestNote||'')}</textarea></label>
      <div class="wide"><h3>D. ข้อเสนอซ่อม</h3></div>
      <label>ผู้ให้บริการ / อู่ที่เสนอ<select name="proposedVendorId">${vendorOptions(old?.proposedVendorId||'')}</select></label>
      <label>ประมาณการ<input name="estimatedCost" type="number" min="0" step="0.01" value="${esc(old?.estimatedCost??0)}"></label>
      <div class="wide"><h3>E. รูป/ไฟล์ประกอบ</h3></div>
      <label class="wide">เพิ่มไฟล์<input name="requestAttachments" type="file" multiple></label>
      <div class="wide muted">${old?.attachments?.length?`มีไฟล์เดิม ${old.attachments.length} ไฟล์ — ไฟล์ใหม่จะถูกเพิ่มต่อท้าย`:'ยังไม่มีไฟล์แนบ'}</div>`;
    formModal(old?`แก้ไขคำขอ ${old.requestNo}`:'เพิ่มคำขอซ่อม',html,async p=>{
      const files=await readSelectedFiles();
      return old?editRequest(old.id,p,files):createRequest(p,files);
    });
    setTimeout(()=>{
      const assetSel=dialog?.querySelector?.('[name=assetId]'),meter=dialog?.querySelector?.('[name=meterValue]'),info=$('#mrAssetInfo'),warn=$('#mrMeterWarn');
      const draw=()=>{
        const a=assetById(assetSel?.value||'');
        if(info)info.innerHTML=a?`<b>${esc(assetLabelFor(a))}</b><span>${esc(a.brandName||'')} ${esc(a.modelName||'')} · มิเตอร์ล่าสุด ${esc(a.mileage??0)} ${a.meterUnit==='hour'?'ชม.':'กม.'}</span>`:'<span>เลือกทรัพย์สินเพื่อดูข้อมูล</span>';
        const val=String(meter?.value??'').trim();
        if(warn)warn.textContent=a&&val!==''&&Number(val)<Number(a.mileage||0)?`คำเตือน: มิเตอร์ที่กรอก (${val}) ต่ำกว่ามิเตอร์ล่าสุดของทรัพย์สิน (${a.mileage||0}) — สามารถบันทึกได้แต่ควรตรวจสอบอีกครั้ง`:'';
      };
      if(assetSel)assetSel.onchange=draw;if(meter)meter.oninput=draw;draw();
    },0);
  }

  function renderRequestRows(){
    ensureRequestState();
    const box=$('#mrRows');if(!box)return;
    const q=norm($('#mrQ')?.value),status=$('#mrStatus')?.value||'',urgency=$('#mrUrgency')?.value||'';
    requestPageSize=Number($('#mrSize')?.value||requestPageSize)||20;
    let rows=STATE.maintenanceRequests.slice().sort((a,b)=>String(b.requestNo||'').localeCompare(String(a.requestNo||'')));
    if(status)rows=rows.filter(r=>r.status===status);if(urgency)rows=rows.filter(r=>r.urgency===urgency);
    if(q)rows=rows.filter(r=>{const a=assetById(r.assetId);return norm(`${r.requestNo} ${r.requestDate} ${assetLabelFor(a)} ${r.requesterNameSnapshot} ${r.issue} ${r.proposedVendorNameSnapshot}`).includes(q)});
    const pages=Math.max(1,Math.ceil(rows.length/requestPageSize));requestPage=Math.min(Math.max(1,requestPage),pages);
    const start=(requestPage-1)*requestPageSize,show=rows.slice(start,start+requestPageSize);
    box.innerHTML=show.length?`<table><thead><tr><th>เลขที่คำขอ</th><th>วันที่</th><th>ทรัพย์สิน-ทะเบียน</th><th>ผู้แจ้ง</th><th>อาการ</th><th>ความเร่งด่วน</th><th>อู่ที่เสนอ</th><th>ประมาณการ</th><th>สถานะ</th><th>มี Work Order แล้วหรือไม่</th><th>จัดการ</th></tr></thead><tbody>${show.map(r=>`<tr data-mr-row="${esc(r.id)}"><td><b>${esc(r.requestNo)}</b></td><td>${esc(r.requestDate||'-')}</td><td>${esc(assetLabelFor(assetById(r.assetId)))}</td><td>${esc(r.requesterNameSnapshot||'-')}</td><td>${esc(r.issue||'-')}</td><td>${esc(urgencyLabel(r.urgency))}</td><td>${esc(r.proposedVendorNameSnapshot||'-')}</td><td>${money(r.estimatedCost)}</td><td>${pill(r.status)} ${esc(statusLabel(r.status))}</td><td>${workOrderBadge(r)}</td><td>${canEdit()&&r.status==='draft'?`<button class="btn sm" data-mr-edit="${esc(r.id)}">แก้ไข</button>`:''}${canCancel()&&r.status==='draft'?` <button class="btn sm" data-mr-cancel="${esc(r.id)}">ยกเลิก</button>`:''}</td></tr>`).join('')}</tbody></table><div class="toolbar"><span class="muted">${rows.length} รายการ · หน้า ${requestPage}/${pages}</span><div><button class="btn sm" id="mrPrev" ${requestPage<=1?'disabled':''}>← ก่อนหน้า</button> <button class="btn sm" id="mrNext" ${requestPage>=pages?'disabled':''}>ถัดไป →</button></div></div>`:'<div class="empty">ยังไม่มีคำขอซ่อม</div>';
    $$('[data-mr-row]').forEach(r=>r.onclick=()=>requestDetail(r.dataset.mrRow));
    $$('[data-mr-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();requestForm(b.dataset.mrEdit)});
    $$('[data-mr-cancel]').forEach(b=>b.onclick=e=>{e.stopPropagation();try{if(typeof confirm==='function'&&!confirm('ยืนยันยกเลิกคำขอซ่อมนี้?'))return;cancelRequest(b.dataset.mrCancel);renderRequestRows();toast('ยกเลิกคำขอซ่อมแล้ว')}catch(x){toast(x.message||String(x),true)}});
    if($('#mrPrev'))$('#mrPrev').onclick=()=>{requestPage--;renderRequestRows()};if($('#mrNext'))$('#mrNext').onclick=()=>{requestPage++;renderRequestRows()};
  }

  function requestRegistry(target=content){
    if(!canView())return target.innerHTML='<div class="panel"><div class="empty">บทบาทนี้ไม่มีสิทธิ์ดูคำขอซ่อม</div></div>';
    ensureRequestState();
    target.innerHTML=`<div class="panel"><div class="toolbar"><div><h3>Maintenance Request Registry</h3><div class="muted">คำขอแจ้งซ่อมก่อนเข้าสู่ขั้นตอนจัดทำเอกสารอนุมัติ</div></div>${canCreate()?'<button class="btn primary" id="newMR">+ คำขอซ่อม</button>':''}</div><div class="toolbar"><div class="left"><input id="mrQ" placeholder="ค้นหาเลขที่ / ทรัพย์สิน / ผู้แจ้ง / อาการ / อู่"><select id="mrStatus"><option value="">ทุกสถานะ</option><option value="draft">ร่าง</option><option value="cancelled">ยกเลิก</option></select><select id="mrUrgency"><option value="">ทุกความเร่งด่วน</option><option value="low">ต่ำ</option><option value="normal">ปกติ</option><option value="high">สูง</option><option value="critical">เร่งด่วนมาก</option></select><select id="mrSize"><option>10</option><option selected>20</option><option>50</option></select><button class="btn" id="mrClear">ล้างตัวกรอง</button></div></div><div id="mrRows"></div></div>`;
    if($('#newMR'))$('#newMR').onclick=()=>requestForm();
    $('#mrQ').oninput=()=>{requestPage=1;renderRequestRows()};$('#mrStatus').onchange=()=>{requestPage=1;renderRequestRows()};$('#mrUrgency').onchange=()=>{requestPage=1;renderRequestRows()};$('#mrSize').onchange=()=>{requestPage=1;renderRequestRows()};$('#mrClear').onclick=()=>{$('#mrQ').value='';$('#mrStatus').value='';$('#mrUrgency').value='';$('#mrSize').value='20';requestPage=1;renderRequestRows()};renderRequestRows();
  }

  function attachmentHtml(a){
    if(!a)return '';
    if(String(a.type||'').startsWith('image/')&&a.data)return `<div class="thumb"><img src="${esc(a.data)}"><small>${esc(a.name||'รูป')}</small></div>`;
    return a.data?`<a class="btn sm" href="${esc(a.data)}" download="${esc(a.name||'attachment')}">${esc(a.name||'ไฟล์')}</a>`:`<span>${esc(a.name||'ไฟล์')}</span>`;
  }

  function requestDetail(id){
    if(!canView())return toast('บทบาทนี้ไม่มีสิทธิ์ดูคำขอซ่อม',true);
    ensureRequestState();const r=STATE.maintenanceRequests.find(x=>x&&x.id===id);if(!r)return requestRegistry();
    const a=assetById(r.assetId),wos=(STATE.workOrders||[]).filter(wo=>wo&&wo.sourceRequestId===r.id),logs=STATE.audit.filter(x=>x&&x.entity==='maintenanceRequest'&&x.recordId===r.id);
    setHead(r.requestNo,'Maintenance Request Detail');
    content.innerHTML=`<div class="panel"><div class="toolbar"><button class="btn" id="mrBack">← กลับทะเบียน</button><div>${canEdit()&&r.status==='draft'?'<button class="btn" id="mrEdit">แก้ไข</button>':''}${canCancel()&&r.status==='draft'?' <button class="btn" id="mrCancel">ยกเลิกคำขอ</button>':''}</div></div><div class="hero-info">${kv('เลขที่คำขอ',r.requestNo)}${kv('ทรัพย์สิน',assetLabelFor(a))}${kv('สถานะ',statusLabel(r.status))}${kv('ความเร่งด่วน',urgencyLabel(r.urgency))}${kv('ประมาณการ',`฿${money(r.estimatedCost)}`)}${kv('Work Order',hasWorkOrder(r)?'มีแล้ว':'ยังไม่มี')}</div></div>
      <div class="grid2"><div class="panel"><h3>ข้อมูลคำขอ</h3><div class="grid3">${kv('วันที่แจ้ง',r.requestDate)}${kv('ผู้แจ้ง',r.requesterNameSnapshot)}${kv('ประเภทงาน',typeLabel(r.maintenanceType))}${kv('มิเตอร์',r.meterValue===''?'-':r.meterValue)}${kv('อู่ที่เสนอ',r.proposedVendorNameSnapshot||'-')}${kv('ประมาณการ',money(r.estimatedCost))}</div><h4>ปัญหา/อาการ</h4><p>${esc(r.issue||'-')}</p><h4>หมายเหตุ</h4><p>${esc(r.requestNote||'-')}</p></div><div class="panel"><h3>ไฟล์ / รูป</h3><div class="thumb-row">${(r.attachments||[]).map(attachmentHtml).join('')||'<div class="empty">ยังไม่มีไฟล์แนบ</div>'}</div></div></div>
      <div class="grid2"><div class="panel"><h3>งานซ่อมที่เกี่ยวข้อง</h3>${wos.length?`<table><thead><tr><th>เลขที่</th><th>สถานะ</th></tr></thead><tbody>${wos.map(wo=>`<tr><td>${esc(wo.workOrderNo||wo.no||wo.id)}</td><td>${esc(wo.status||'-')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีงานซ่อมที่เกี่ยวข้อง</div>'}</div><div class="panel"><h3>ประวัติ / Audit</h3>${logs.map(l=>`<div class="timeline-row"><b>${esc(l.action||'-')}</b><span>${esc(l.ts||'')} · ${esc(l.user||'')}</span></div>`).join('')||'<div class="empty">ยังไม่มีประวัติ</div>'}</div></div>`;
    $('#mrBack').onclick=()=>window.FLEET_MAINTENANCE_HUB_TEST?.maintenanceHubPage?window.FLEET_MAINTENANCE_HUB_TEST.maintenanceHubPage():requestRegistry();if($('#mrEdit'))$('#mrEdit').onclick=()=>requestForm(r.id);if($('#mrCancel'))$('#mrCancel').onclick=()=>{try{if(typeof confirm==='function'&&!confirm('ยืนยันยกเลิกคำขอซ่อมนี้?'))return;cancelRequest(r.id);requestDetail(r.id);toast('ยกเลิกคำขอซ่อมแล้ว')}catch(x){toast(x.message||String(x),true)}};
  }

  window.FLEET_MAINTENANCE_REQUEST_TEST={
    ensureRequestState,activeVendors,nextRequestNo,hasWorkOrder,workOrderBadge,validateVendor,
    canView,canCreate,canEdit,canCancel,createRequest,editRequest,cancelRequest,requestRegistry,
    requestDetail,requestForm,renderRequestRows,buildRequestPayload,role,actor
  };
})();
