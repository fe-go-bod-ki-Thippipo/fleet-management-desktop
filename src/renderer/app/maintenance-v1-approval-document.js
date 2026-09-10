/* Maintenance Workflow v1 — Batch 5: Approval Document + External Approval Result.
   Additive-only integration. No in-app approval workflow. */
(function(){
  const requestApi=window.FLEET_MAINTENANCE_REQUEST_TEST||null;
  const originalRequestDetail=requestApi?.requestDetail||null;
  let activeRequestId='';
  const role=()=>typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'';
  const canManage=()=>['admin','manager','fleetOfficer'].includes(role());
  const actor=()=>{
    const r=role();if(!r)return '';
    return (STATE?.userAccounts||[]).find(x=>x&&x.role===r&&x.active!==false)?.personId||r;
  };
  const clone=x=>typeof structuredClone==='function'?structuredClone(x):JSON.parse(JSON.stringify(x));
  const freezeDeep=x=>{if(!x||typeof x!=='object'||Object.isFrozen(x))return x;Object.freeze(x);Object.values(x).forEach(freezeDeep);return x;};
  const num=v=>Number.isFinite(Number(v))?Number(v):0;

  function ensureApprovalState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.generatedApprovalDocuments??=[];
    STATE.returnedApprovalAttachments??=[];
    STATE.externalApprovalResults??=[];
    STATE.maintenanceRequests??=[];
    STATE.workOrders??=[];
    STATE.assets??=[];
    STATE.vendors??=[];
    STATE.repairItems??=[];
    STATE.partItems??=[];
    STATE.labourItems??=[];
    STATE.vendorDispatches??=[];
    STATE.externalServiceCosts??=[];
    STATE.userAccounts??=[];
  }

  function requestById(id){ensureApprovalState();return STATE.maintenanceRequests.find(x=>x&&x.id===id)||null;}
  function assetById(id){ensureApprovalState();return STATE.assets.find(x=>x&&x.id===id&&!x.deleted)||null;}
  function vendorById(id){ensureApprovalState();return STATE.vendors.find(x=>x&&x.id===id)||null;}
  function docsForRequest(id){ensureApprovalState();return STATE.generatedApprovalDocuments.filter(x=>x&&x.requestId===id).sort((a,b)=>a.version-b.version);}
  function resultForRequest(id){ensureApprovalState();return STATE.externalApprovalResults.find(x=>x&&x.requestId===id)||null;}
  function hasLinkedWorkOrder(id){ensureApprovalState();return STATE.workOrders.some(x=>x&&x.sourceRequestId===id);}
  function hasApprovedResult(id){const r=resultForRequest(id);return !!r&&['approved','conditional'].includes(r.externalDecision);}

  function workOrderCost(wo){
    const api=window.FLEET_MAINTENANCE_MIGRATION_TEST;
    if(api?.workOrderTotalCost)return num(api.workOrderTotalCost(wo));
    const id=typeof wo==='string'?wo:wo?.id;if(!id)return 0;
    const parts=STATE.partItems.filter(x=>x.workOrderId===id).reduce((s,x)=>s+num(x.lineTotal!==undefined?x.lineTotal:num(x.qty)*num(x.unitCost)),0);
    const labour=STATE.labourItems.filter(x=>x.workOrderId===id).reduce((s,x)=>s+num(x.lineTotal!==undefined?x.lineTotal:num(x.hours)*num(x.rate)),0);
    const dispatchIds=new Set(STATE.vendorDispatches.filter(x=>x.workOrderId===id).map(x=>x.id));
    const external=STATE.externalServiceCosts.filter(x=>dispatchIds.has(x.vendorDispatchId)).reduce((s,x)=>s+num(x.amount),0);
    return parts+labour+external;
  }

  function repairDescription(wo){
    const rows=STATE.repairItems.filter(x=>x&&x.workOrderId===wo.id);
    return rows.map(x=>String(x.description||'').trim()).filter(Boolean).join(', ')||wo.issue||wo.description||'-';
  }
  function vendorLabel(wo){return String(wo.vendorNameSnapshot||vendorById(wo.vendorId)?.name||'-');}
  function repairHistory(asset){
    ensureApprovalState();
    if(!asset)return {last12MonthCount:0,last12MonthTotal:0,latest5:[]};
    const closed=STATE.workOrders.filter(w=>w&&w.assetId===asset.id&&w.status==='closed').slice().sort((a,b)=>String(b.closedAt||'').localeCompare(String(a.closedAt||'')));
    const nowValue=typeof now==='function'?now():new Date().toISOString();
    const cutoff=new Date(new Date(nowValue).getTime()-365*24*60*60*1000);
    const in12=closed.filter(w=>{const d=new Date(w.closedAt||0);return !Number.isNaN(d.getTime())&&d>=cutoff;});
    return {
      last12MonthCount:in12.length,
      last12MonthTotal:in12.reduce((s,w)=>s+workOrderCost(w),0),
      latest5:closed.slice(0,5).map(w=>({closedAt:w.closedAt||'',description:repairDescription(w),vendorLabel:vendorLabel(w),mileage:w.odometerAtOpen??w.meterValue??'',cost:workOrderCost(w)}))
    };
  }

  function buildSnapshot(request){
    const asset=assetById(request.assetId);if(!asset)throw Error('ไม่พบข้อมูลทรัพย์สินของคำขอ');
    const vendor=vendorById(request.proposedVendorId);
    return freezeDeep({
      request:{requestNo:request.requestNo,requestDate:request.requestDate,requesterNameSnapshot:request.requesterNameSnapshot,urgency:request.urgency,issue:request.issue,requestNote:request.requestNote},
      asset:{code:asset.code||'',plate:asset.plate||'',brandName:asset.brandName||'',modelName:asset.modelName||'',modelYear:asset.modelYear||'',mileage:asset.mileage??'',meterUnit:asset.meterUnit||'',companyName:typeof coName==='function'?coName(asset.companyId):(asset.companyName||''),unitName:typeof ouName==='function'?ouName(asset.managingOperatingUnitId):(asset.unitName||'')},
      proposal:{vendorNameSnapshot:request.proposedVendorNameSnapshot||vendor?.name||'',vendorContact:[vendor?.contactName,vendor?.phone].filter(Boolean).join(' · '),estimatedCost:num(request.estimatedCost)},
      repairHistory:repairHistory(asset)
    });
  }

  function audit(action,entity,id,before,after){if(typeof pAudit!=='function')throw Error('Audit service ไม่พร้อมใช้งาน');pAudit(action,entity,id,before,after);}

  function generateApprovalDocument(requestId){
    if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์สร้างหรือพิมพ์ใบขออนุมัติซ่อม');
    ensureApprovalState();const request=requestById(requestId);if(!request)throw Error('ไม่พบคำขอซ่อม');
    if(request.status==='cancelled')throw Error('ไม่สามารถสร้างเอกสารจากคำขอที่ยกเลิกแล้ว');
    const existing=docsForRequest(requestId),version=(existing.at(-1)?.version||0)+1;
    existing.forEach(d=>{d.superseded=true;});
    const ts=typeof now==='function'?now():new Date().toISOString();
    const doc={id:typeof uid==='function'?uid('APD'):`APD-${Date.now()}`,requestId,version,documentNo:`${request.requestNo}-v${version}`,generatedAt:ts,generatedBy:actor(),snapshotData:buildSnapshot(request),superseded:false};
    STATE.generatedApprovalDocuments.push(doc);
    if(version===1&&request.status==='draft'){request.status='document_printed';request.updatedAt=ts;request.updatedBy=actor();}
    audit('สร้างใบขออนุมัติซ่อม','approvalDocument',doc.id,null,clone(doc));
    return doc;
  }

  function validateDocumentVersion(requestId,documentVersionId){
    const doc=STATE.generatedApprovalDocuments.find(x=>x&&x.id===documentVersionId&&x.requestId===requestId);
    if(!doc)throw Error('กรุณาเลือก version เอกสารที่ถูกนำไปเซ็นจริง');return doc;
  }

  function saveExternalApprovalResult(requestId,p,attachmentData=null){
    if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์บันทึกผลอนุมัติจากภายนอก');
    ensureApprovalState();const request=requestById(requestId);if(!request)throw Error('ไม่พบคำขอซ่อม');
    const old=resultForRequest(requestId);
    if(old&&hasLinkedWorkOrder(requestId))throw Error('ไม่สามารถแก้ไขผลอนุมัติหลังสร้าง Work Order แล้ว');
    if(!old&&request.status!=='document_printed')throw Error('ต้องพิมพ์ใบขออนุมัติก่อนบันทึกผลอนุมัติจากภายนอก');
    const decision=String(p.externalDecision||'').trim();if(!['approved','rejected','conditional'].includes(decision))throw Error('กรุณาระบุผลการอนุมัติ');
    const documentVersion=validateDocumentVersion(requestId,String(p.documentVersionId||''));
    let attachmentId=old?.returnedApprovalAttachmentId||null;
    if(attachmentData?.fileRef){
      const att={id:typeof uid==='function'?uid('RAA'):`RAA-${Date.now()}`,requestId,uploadedAt:typeof now==='function'?now():new Date().toISOString(),uploadedBy:actor(),fileRef:String(attachmentData.fileRef),note:String(attachmentData.note||p.attachmentNote||'')};
      STATE.returnedApprovalAttachments.push(att);attachmentId=att.id;
    }
    const amountRaw=String(p.externalApprovedAmount??'').trim();
    const data={requestId,externalDecision:decision,externalApprovedBy:String(p.externalApprovedBy||'').trim(),externalApprovedAt:String(p.externalApprovedAt||'').trim(),externalApprovedAmount:amountRaw===''?null:Number(amountRaw),externalApprovalNote:String(p.externalApprovalNote||'').trim(),returnedApprovalAttachmentId:attachmentId,documentVersionId:documentVersion.id,recordedBy:actor(),recordedAt:typeof now==='function'?now():new Date().toISOString()};
    let result;
    if(old){const before=clone(old);Object.assign(old,data);result=old;audit('แก้ไขผลอนุมัติจากภายนอก','externalApprovalResult',old.id,before,clone(old));}
    else{result={id:typeof uid==='function'?uid('EAR'):`EAR-${Date.now()}`,...data};STATE.externalApprovalResults.push(result);audit('บันทึกผลอนุมัติจากภายนอก','externalApprovalResult',result.id,null,clone(result));}
    request.status=decision==='rejected'?'rejected':'approved';request.updatedAt=result.recordedAt;request.updatedBy=result.recordedBy;
    return result;
  }

  function readReturnedApprovalFile(){
    const input=typeof dialog!=='undefined'&&dialog?.querySelector?dialog.querySelector('[name=returnedApprovalFile]'):null;
    const file=input?.files?.[0];if(!file)return Promise.resolve(null);
    return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve({fileRef:String(fr.result||''),note:String(dialog?.querySelector?.('[name=attachmentNote]')?.value||'')});fr.onerror=()=>reject(fr.error||Error('อ่านไฟล์ไม่สำเร็จ'));fr.readAsDataURL(file);});
  }

  function decisionLabel(v){return ({approved:'อนุมัติ',rejected:'ไม่อนุมัติ',conditional:'อนุมัติแบบมีเงื่อนไข'})[v]||v||'-';}
  function approvalPanelsHtml(requestId){
    const request=requestById(requestId);if(!request)return '';
    const docs=docsForRequest(requestId),result=resultForRequest(requestId),manage=canManage();
    const versions=docs.length?`<table><thead><tr><th>Version</th><th>เลขที่เอกสาร</th><th>วันที่สร้าง</th><th>สถานะ</th><th></th></tr></thead><tbody>${docs.map(d=>`<tr><td>v${d.version}</td><td>${esc(d.documentNo)}</td><td>${esc(d.generatedAt||'-')}</td><td>${d.superseded?'<span class="pill">ถูกแทนที่แล้ว</span>':'<span class="pill ok">ฉบับล่าสุด</span>'}</td><td><button class="btn sm" data-apd-view="${esc(d.id)}">เปิดดู</button>${manage?` <button class="btn sm" data-apd-reprint="${esc(d.id)}">พิมพ์ซ้ำ</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีเอกสารที่สร้าง</div>';
    const nextVersion=(docs.at(-1)?.version||0)+1;
    const createButton=manage&&request.status!=='cancelled'?`<button class="btn primary" id="apdGenerate">${docs.length?`พิมพ์ฉบับใหม่ (v${nextVersion})`:'พิมพ์ใบขออนุมัติ'}</button>`:'';
    let resultHtml;
    if(result){
      const att=STATE.returnedApprovalAttachments.find(x=>x&&x.id===result.returnedApprovalAttachmentId);
      const attachmentHtml=att?.fileRef?`<a class="btn sm" href="${esc(att.fileRef)}" target="_blank" rel="noopener">เปิดไฟล์</a>`:'ไม่มี';
      resultHtml=`<div class="grid3">${kv('ผล',decisionLabel(result.externalDecision))}${kv('ผู้อนุมัติ',result.externalApprovedBy||'-')}${kv('วันที่',result.externalApprovedAt||'-')}${kv('วงเงิน',result.externalApprovedAmount==null?'-':`฿${money(result.externalApprovedAmount)}`)}${kv('เอกสารที่ใช้',docs.find(d=>d.id===result.documentVersionId)?.documentNo||'-')}<div><b>ไฟล์แนบกลับ</b><br>${attachmentHtml}</div></div><h4>หมายเหตุ</h4><p>${esc(result.externalApprovalNote||'-')}</p>${manage&&!hasLinkedWorkOrder(requestId)?'<button class="btn" id="apdEditResult">แก้ไขผลอนุมัติ</button>':''}`;
    }else resultHtml=request.status==='document_printed'&&manage?'<button class="btn primary" id="apdRecordResult">บันทึกผลอนุมัติจากภายนอก</button>':'<div class="empty">ยังไม่มีผลอนุมัติจากภายนอก</div>';
    return `<div id="apdPanels"><div class="panel"><div class="toolbar"><div><h3>เอกสารขออนุมัติซ่อม</h3><div class="muted">สร้างเอกสารเพื่อพิมพ์และนำไปอนุมัติภายนอกระบบ</div></div>${createButton}</div>${versions}</div><div class="panel"><h3>ผลอนุมัติจากภายนอก</h3>${resultHtml}</div></div>`;
  }

  function repairHistoryPrintHtml(h){
    if(!h?.latest5?.length)return `<p>12 เดือนที่ผ่านมา: ซ่อม ${h?.last12MonthCount||0} ครั้ง รวม ${money(h?.last12MonthTotal||0)} บาท</p><p>ไม่มีประวัติการซ่อมก่อนหน้า</p>`;
    return `<p>12 เดือนที่ผ่านมา: ซ่อม ${h.last12MonthCount} ครั้ง รวม ${money(h.last12MonthTotal)} บาท</p><table><thead><tr><th>วันที่</th><th>รายการ</th><th>Vendor</th><th>มิเตอร์</th><th>ค่าใช้จ่าย</th></tr></thead><tbody>${h.latest5.map(x=>`<tr><td>${esc(x.closedAt||'-')}</td><td>${esc(x.description||'-')}</td><td>${esc(x.vendorLabel||'-')}</td><td>${esc(x.mileage===''?'-':x.mileage)}</td><td>${money(x.cost)}</td></tr>`).join('')}</tbody></table>`;
  }

  function printSheetHtml(doc){
    const s=doc.snapshotData,r=s.request,a=s.asset,p=s.proposal,h=s.repairHistory;
    return `<div class="print-sheet"><h2>ใบขออนุมัติซ่อม</h2><div class="print-grid"><div><b>เลขที่เอกสาร</b><br>${esc(doc.documentNo)}</div><div><b>วันที่พิมพ์</b><br>${esc(String(doc.generatedAt||'').slice(0,10))}</div></div><h3>A. คำขอ</h3><div class="print-grid"><div>เลขที่คำขอ: ${esc(r.requestNo||'-')}</div><div>วันที่: ${esc(r.requestDate||'-')}</div><div>ผู้แจ้ง: ${esc(r.requesterNameSnapshot||'-')}</div><div>หน่วยงาน: ${esc(a.unitName||'-')}</div><div>ความเร่งด่วน: ${esc(r.urgency||'-')}</div><div>อาการ/เหตุผล: ${esc(r.issue||'-')}</div></div><h3>B. ทรัพย์สิน</h3><div class="print-grid"><div>รหัส: ${esc(a.code||'-')}</div><div>ทะเบียน: ${esc(a.plate||'-')}</div><div>ยี่ห้อ/รุ่น: ${esc(`${a.brandName||''} ${a.modelName||''}`.trim()||'-')}</div><div>ปี: ${esc(a.modelYear||'-')}</div><div>เลขไมล์ล่าสุด: ${esc(a.mileage===''?'-':a.mileage)} ${esc(a.meterUnit||'')}</div><div>บริษัท: ${esc(a.companyName||'-')}</div><div>หน่วยดูแล: ${esc(a.unitName||'-')}</div></div><h3>C. ข้อเสนอซ่อม</h3><div class="print-grid"><div>คำอธิบาย: ${esc(r.issue||'-')}</div><div>ผู้ให้บริการที่เสนอ: ${esc(p.vendorNameSnapshot||'-')}</div><div>ติดต่อ: ${esc(p.vendorContact||'-')}</div><div>ประมาณการ: ${money(p.estimatedCost)} บาท</div></div><h3>D. ประวัติการซ่อม</h3>${repairHistoryPrintHtml(h)}<h3>E. ผลอนุมัติภายนอก</h3><div class="sign"><div>□ อนุมัติ<br>□ ไม่อนุมัติ<br>□ อนุมัติแบบมีเงื่อนไข<br><br>วงเงินที่อนุมัติ ____________________<br>หมายเหตุ __________________________</div><div>ผู้อนุมัติ __________________________<br>วันที่ ______________________________<br><br>ลายเซ็น ____________________________</div></div></div>`;
  }

  function viewDocument(doc){
    if(!doc)throw Error('ไม่พบเอกสาร');
    const w=typeof window.open==='function'?window.open('','_blank'):null;
    if(!w||!w.document?.write)throw Error('ไม่สามารถเปิดหน้าดูเอกสารได้');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.documentNo||'ใบขออนุมัติซ่อม')}</title><link rel="stylesheet" href="styles.css"></head><body>${printSheetHtml(doc)}</body></html>`);
    if(typeof w.document.close==='function')w.document.close();
    return w;
  }
  function viewDocumentById(documentId){ensureApprovalState();return viewDocument(STATE.generatedApprovalDocuments.find(x=>x&&x.id===documentId));}

  function printDocument(doc){
    if(!canManage())throw Error('บทบาทนี้ไม่มีสิทธิ์สร้างหรือพิมพ์ใบขออนุมัติซ่อม');
    if(!doc)throw Error('ไม่พบเอกสาร');
    content.innerHTML+=printSheetHtml(doc);
    if(typeof window.print==='function')window.print();
    wrappedRequestDetail(doc.requestId);
  }
  function generateAndPrint(requestId){const doc=generateApprovalDocument(requestId);printDocument(doc);return doc;}

  function resultForm(requestId){
    if(!canManage())return toast('บทบาทนี้ไม่มีสิทธิ์บันทึกผลอนุมัติจากภายนอก',true);
    const request=requestById(requestId),old=resultForRequest(requestId);if(!request)return toast('ไม่พบคำขอซ่อม',true);
    if(old&&hasLinkedWorkOrder(requestId))return toast('ไม่สามารถแก้ไขผลอนุมัติหลังสร้าง Work Order แล้ว',true);
    const docs=docsForRequest(requestId);if(!docs.length)return toast('ต้องพิมพ์ใบขออนุมัติก่อน',true);
    const selected=old?.documentVersionId||docs.at(-1).id;
    const options=docs.map(d=>`<option value="${esc(d.id)}" ${d.id===selected?'selected':''}>${esc(d.documentNo)}${d.superseded?' — ถูกแทนที่แล้ว':' — ฉบับล่าสุด'}</option>`).join('');
    const html=`<div class="wide"><h3>ผลอนุมัติจากภายนอก</h3></div><div class="wide"><label><input type="radio" name="externalDecision" value="approved" ${!old||old.externalDecision==='approved'?'checked':''}> อนุมัติ</label> <label><input type="radio" name="externalDecision" value="rejected" ${old?.externalDecision==='rejected'?'checked':''}> ไม่อนุมัติ</label> <label><input type="radio" name="externalDecision" value="conditional" ${old?.externalDecision==='conditional'?'checked':''}> อนุมัติแบบมีเงื่อนไข</label></div><label>ผู้อนุมัติ<input name="externalApprovedBy" value="${esc(old?.externalApprovedBy||'')}"></label><label>วันที่อนุมัติ<input type="date" name="externalApprovedAt" value="${esc(old?.externalApprovedAt||'')}"></label><label>วงเงินที่อนุมัติ<input type="number" step="0.01" min="0" name="externalApprovedAmount" value="${esc(old?.externalApprovedAmount??'')}"></label><label>เอกสารที่ถูกนำไปเซ็นจริง<select name="documentVersionId" required>${options}</select> <button type="button" class="btn sm" id="apdViewSelected">เปิดดู</button></label><label class="wide">หมายเหตุ<textarea name="externalApprovalNote">${esc(old?.externalApprovalNote||'')}</textarea></label><div class="wide"><h3>เอกสารที่แนบกลับมา</h3></div><label class="wide">ไฟล์ scan/photo<input type="file" name="returnedApprovalFile" accept="image/*,.pdf"></label><label class="wide">หมายเหตุไฟล์แนบ<input name="attachmentNote"></label>`;
    formModal(old?'แก้ไขผลอนุมัติจากภายนอก':'บันทึกผลอนุมัติจากภายนอก',html,async p=>{const attachment=await readReturnedApprovalFile();const result=saveExternalApprovalResult(requestId,p,attachment);setTimeout(()=>wrappedRequestDetail(requestId),0);return result;});
    setTimeout(()=>{
      const button=dialog?.querySelector?.('#apdViewSelected'),select=dialog?.querySelector?.('[name=documentVersionId]');
      if(button)button.onclick=()=>{try{viewDocumentById(select?.value||selected)}catch(e){toast(e.message||String(e),true)}};
    },0);
  }

  function bindApprovalPanelEvents(requestId){
    if($('#apdGenerate'))$('#apdGenerate').onclick=()=>{try{generateAndPrint(requestId)}catch(e){toast(e.message||String(e),true)}};
    $$('[data-apd-view]').forEach(b=>b.onclick=()=>{try{viewDocumentById(b.dataset.apdView)}catch(e){toast(e.message||String(e),true)}});
    $$('[data-apd-reprint]').forEach(b=>b.onclick=()=>{try{const d=STATE.generatedApprovalDocuments.find(x=>x.id===b.dataset.apdReprint);printDocument(d)}catch(e){toast(e.message||String(e),true)}});
    if($('#apdRecordResult'))$('#apdRecordResult').onclick=()=>resultForm(requestId);
    if($('#apdEditResult'))$('#apdEditResult').onclick=()=>resultForm(requestId);
  }

  function appendApprovalPanels(requestId){
    if(!requestById(requestId))return false;
    if(content?.querySelector?.('#apdPanels'))return false;
    content.insertAdjacentHTML?content.insertAdjacentHTML('beforeend',approvalPanelsHtml(requestId)):content.innerHTML+=approvalPanelsHtml(requestId);
    bindApprovalPanelEvents(requestId);return true;
  }

  function wrappedRequestDetail(id){
    activeRequestId=id;
    if(originalRequestDetail)originalRequestDetail(id);
    appendApprovalPanels(id);
  }

  function restoreApprovalPanelsIfNeeded(){
    if(!content?.querySelector||!content.querySelector('#mrBack')||content.querySelector('#apdPanels'))return false;
    const request=requestById(activeRequestId);
    if(!request)return false;
    return appendApprovalPanels(request.id);
  }

  let approvalObserver=null;
  if(typeof MutationObserver==='function'&&content){
    approvalObserver=new MutationObserver(()=>restoreApprovalPanelsIfNeeded());
    approvalObserver.observe(content,{childList:true,subtree:true});
  }

  if(requestApi&&originalRequestDetail)requestApi.requestDetail=wrappedRequestDetail;

  /* Batch 4 Registry binds its row click to a lexical requestDetail. Intercept only plain row
     navigation so the public wrapped detail is used, while edit/cancel buttons keep their original handlers. */
  if(typeof document!=='undefined'&&document?.addEventListener){document.addEventListener('click',e=>{const t=e.target;if(t?.closest?.('[data-mr-edit],[data-mr-cancel]'))return;const row=t?.closest?.('[data-mr-row]');if(!row)return;e.preventDefault?.();e.stopImmediatePropagation?.();wrappedRequestDetail(row.dataset.mrRow);},true);}

  window.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_API={hasApprovedResult,resultForRequest,docsForRequest};
  window.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_TEST={ensureApprovalState,canManage,actor,repairHistory,buildSnapshot,generateApprovalDocument,saveExternalApprovalResult,hasLinkedWorkOrder,hasApprovedResult,approvalPanelsHtml,printSheetHtml,repairHistoryPrintHtml,wrappedRequestDetail,originalRequestDetail,workOrderCost,docsForRequest,resultForRequest,appendApprovalPanels,restoreApprovalPanelsIfNeeded,approvalObserver,getActiveRequestId:()=>activeRequestId,viewDocument,viewDocumentById,resultForm};
})();