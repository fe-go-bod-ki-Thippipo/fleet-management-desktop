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
      asset:{code:asset.code||'',plate:asset.plate||'',brandName:asset.brandName||'',modelName:asset.modelName||'',modelYear:asset.modelYear||'',mileage:asset.mileage??'',meterUnit:asset.meterUnit||'',companyName:typeof coName==='function'?coName(asset.companyId):(asset.companyName||''),unitName:typeof ouName==='function'?ouName(asset.managingOperatingUnitId):(asset.unitName||''),photoData:asset.photos?.[0]?.data||null},
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
      const attachmentHtml=att?.fileRef?`<button class="btn sm" type="button" data-apd-returned-attachment="${esc(att.id)}">เปิดไฟล์</button>`:'ไม่มี';
      resultHtml=`<div class="grid3">${kv('ผล',decisionLabel(result.externalDecision))}${kv('ผู้อนุมัติ',result.externalApprovedBy||'-')}${kv('วันที่',result.externalApprovedAt||'-')}${kv('วงเงิน',result.externalApprovedAmount==null?'-':`฿${money(result.externalApprovedAmount)}`)}${kv('เอกสารที่ใช้',docs.find(d=>d.id===result.documentVersionId)?.documentNo||'-')}<div><b>ไฟล์แนบกลับ</b><br>${attachmentHtml}</div></div><h4>หมายเหตุ</h4><p>${esc(result.externalApprovalNote||'-')}</p>${manage&&!hasLinkedWorkOrder(requestId)?'<button class="btn" id="apdEditResult">แก้ไขผลอนุมัติ</button>':''}`;
    }else resultHtml=request.status==='document_printed'&&manage?'<button class="btn primary" id="apdRecordResult">บันทึกผลอนุมัติจากภายนอก</button>':'<div class="empty">ยังไม่มีผลอนุมัติจากภายนอก</div>';
    return `<div id="apdPanels"><div class="panel"><div class="toolbar"><div><h3>เอกสารขออนุมัติซ่อม</h3><div class="muted">สร้างเอกสารเพื่อพิมพ์และนำไปอนุมัติภายนอกระบบ</div></div>${createButton}</div>${versions}</div><div class="panel"><h3>ผลอนุมัติจากภายนอก</h3>${resultHtml}</div></div>`;
  }

  function repairHistoryPrintHtml(h){
    const count=h?.last12MonthCount||0,total=h?.last12MonthTotal||0;
    const summary=`<div class="apd-history-summary"><div><span>จำนวนครั้งที่ซ่อม (12 เดือน)</span><b>${count} ครั้ง</b></div><div><span>ค่าใช้จ่ายรวม (12 เดือน)</span><b>${money(total)} บาท</b></div></div>`;
    if(!h?.latest5?.length)return `${summary}<div class="apd-empty-history">ไม่มีประวัติการซ่อมก่อนหน้า</div>`;
    return `${summary}<table class="apd-history-table"><thead><tr><th>วันที่</th><th>รายการ</th><th>Vendor</th><th>มิเตอร์</th><th>ค่าใช้จ่าย</th></tr></thead><tbody>${h.latest5.map(x=>`<tr><td>${esc(x.closedAt||'-')}</td><td>${esc(x.description||'-')}</td><td>${esc(x.vendorLabel||'-')}</td><td>${esc(x.mileage===''?'-':x.mileage)}</td><td>${money(x.cost)}</td></tr>`).join('')}</tbody></table>`;
  }

  function urgencyPrintMeta(value){
    const raw=String(value||'').trim(),key=raw.toLowerCase();
    if(['critical','urgent','very_high','เร่งด่วนมาก'].includes(key))return {label:'เร่งด่วนมาก',cls:'apd-urgency-critical'};
    if(['high','สูง'].includes(key))return {label:'สูง',cls:'apd-urgency-high'};
    if(['low','ต่ำ'].includes(key))return {label:'ต่ำ',cls:'apd-urgency-low'};
    if(['medium','normal','ปกติ','กลาง','ปานกลาง'].includes(key))return {label:key==='medium'||key==='กลาง'||key==='ปานกลาง'?'ปานกลาง':'ปกติ',cls:'apd-urgency-normal'};
    return {label:raw||'-',cls:'apd-urgency-normal'};
  }

  function printSheetHtml(doc){
    const s=doc.snapshotData,r=s.request,a=s.asset,p=s.proposal,h=s.repairHistory,urgency=urgencyPrintMeta(r.urgency);
    const company=String(a.companyName||'').trim()||'FLEET MANAGEMENT';
    const assetPhoto=a.photoData?`<img class="apd-asset-photo" src="${a.photoData}" alt="รูปทรัพย์สิน">`:`<div class="apd-photo-placeholder"><div class="apd-photo-icon">🚙</div><span>ยังไม่มีรูปทรัพย์สิน</span></div>`;
    const statusText=doc.superseded?'ถูกแทนที่แล้ว':'ฉบับล่าสุด';
    return `<div class="print-sheet apd-sheet"><style>
      .apd-sheet{font-family:Arial,'Noto Sans Thai',Tahoma,sans-serif;color:#162033;background:#fff;padding:22px;box-sizing:border-box;line-height:1.45}
      .apd-sheet *{box-sizing:border-box}.apd-header{display:grid;grid-template-columns:1fr 290px;gap:20px;align-items:start;border-bottom:3px solid #173f68;padding-bottom:16px;margin-bottom:18px}
      .apd-brand{display:flex;gap:14px;align-items:center}.apd-logo{width:54px;height:54px;border:2px solid #173f68;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:29px;background:#eef5fb}
      .apd-brand-name{font-size:20px;font-weight:800;color:#12385d;letter-spacing:.2px}.apd-brand-sub{font-size:12px;color:#64748b;margin-top:3px}.apd-title{text-align:center;margin:12px 0 0;font-size:29px;color:#142b49}.apd-subtitle{text-align:center;color:#58708d;font-size:12px;letter-spacing:.8px;margin-top:2px}
      .apd-meta{border:1px solid #b6c8d9;border-radius:10px;background:#f7fafc;padding:11px 13px;display:grid;gap:5px;font-size:12px}.apd-meta-row{display:grid;grid-template-columns:92px 1fr;gap:8px}.apd-meta-row b{color:#274a6d}.apd-status{display:inline-block;font-weight:700;color:#173f68;background:#e5f0fa;border-radius:999px;padding:2px 9px}
      .apd-card{border:1px solid #c9d6e2;border-radius:10px;margin:0 0 12px;overflow:hidden;break-inside:avoid;background:#fff}.apd-card-head{display:flex;align-items:center;gap:9px;background:#173f68;color:#fff;padding:8px 12px;font-size:15px;font-weight:800}.apd-card-head .apd-icon{font-size:17px}.apd-card-body{padding:12px 14px}
      .apd-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}.apd-field{display:grid;grid-template-columns:120px 1fr;gap:8px;border-bottom:1px solid #e4eaf0;padding:5px 0;min-height:30px}.apd-field.apd-wide{grid-column:1/-1}.apd-label{font-size:11px;font-weight:700;color:#5b6f82}.apd-value{font-size:12px;color:#17283a;overflow-wrap:anywhere}
      .apd-urgency{display:inline-block;border-radius:999px;padding:3px 12px;font-weight:800;font-size:11px;border:1px solid transparent}.apd-urgency-critical{background:#fee2e2;color:#991b1b;border-color:#fecaca}.apd-urgency-high{background:#ffedd5;color:#9a3412;border-color:#fed7aa}.apd-urgency-normal{background:#dcfce7;color:#166534;border-color:#bbf7d0}.apd-urgency-low{background:#f1f5f9;color:#475569;border-color:#dbe2ea}
      .apd-asset-wrap{display:grid;grid-template-columns:210px 1fr;gap:16px;align-items:start}.apd-asset-photo,.apd-photo-placeholder{width:210px;height:130px;border-radius:8px;border:1px solid #ccd8e3;background:#f4f7fa}.apd-asset-photo{display:block;object-fit:cover}.apd-photo-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7b8c9d}.apd-photo-icon{font-size:34px;margin-bottom:3px}.apd-photo-placeholder span{font-size:11px}
      .apd-history-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.apd-history-summary>div{border:1px solid #d4dee8;border-radius:8px;background:#f8fafc;padding:8px 12px;text-align:center}.apd-history-summary span{display:block;font-size:10px;color:#6b7d90}.apd-history-summary b{display:block;font-size:16px;color:#173f68;margin-top:2px}.apd-history-table{width:100%;border-collapse:collapse;font-size:10.5px}.apd-history-table th{background:#244e75;color:#fff;padding:7px 6px;text-align:left;border:1px solid #244e75}.apd-history-table td{padding:6px;border:1px solid #d8e1e9}.apd-history-table tbody tr:nth-child(even){background:#f4f7fa}.apd-empty-history{text-align:center;padding:14px;border:1px dashed #cbd5df;border-radius:8px;color:#718096;background:#fafcfd;font-size:11px}
      .apd-approval{display:grid;grid-template-columns:1.08fr .92fr;gap:18px}.apd-choices{display:grid;gap:8px;padding:5px 0}.apd-choice{display:block;border:1px solid #cfd9e3;border-radius:7px;padding:7px 10px;background:#fbfcfd;font-weight:700;font-size:12px}.apd-lines{font-size:12px;line-height:2.15}.apd-signature{border-left:1px solid #d9e2ea;padding-left:18px;min-height:120px;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;font-size:12px}.apd-sign-line{border-top:1px solid #66788a;padding-top:5px;margin-top:28px}
      .apd-footer{border-top:1px solid #b8c7d5;margin-top:14px;padding-top:7px;text-align:right;color:#6b7b8c;font-size:9.5px}.apd-muted{color:#6b7d90}
      @media print{.apd-sheet{padding:10mm 9mm;font-size:11px}.apd-card{break-inside:avoid}.apd-header{grid-template-columns:1fr 255px}.apd-asset-wrap{grid-template-columns:180px 1fr}.apd-asset-photo,.apd-photo-placeholder{width:180px;height:112px}}
    </style><header class="apd-header"><div><div class="apd-brand"><div class="apd-logo">🚘</div><div><div class="apd-brand-name">${esc(company)}</div><div class="apd-brand-sub">FLEET MANAGEMENT · MAINTENANCE CONTROL</div></div></div><h2 class="apd-title">ใบขออนุมัติซ่อม</h2><div class="apd-subtitle">MAINTENANCE REPAIR APPROVAL REQUEST</div></div><div class="apd-meta"><div class="apd-meta-row"><b>เลขที่เอกสาร</b><span>${esc(doc.documentNo)}</span></div><div class="apd-meta-row"><b>วันที่ขอ</b><span>${esc(r.requestDate||'-')}</span></div><div class="apd-meta-row"><b>วันที่พิมพ์</b><span>${esc(String(doc.generatedAt||'').slice(0,10))}</span></div><div class="apd-meta-row"><b>สถานะ</b><span><span class="apd-status">${esc(statusText)}</span></span></div></div></header>
    <section class="apd-card"><div class="apd-card-head"><span class="apd-icon">📄</span><span>A. คำขอ</span></div><div class="apd-card-body apd-grid"><div class="apd-field"><span class="apd-label">เลขที่คำขอ</span><span class="apd-value">${esc(r.requestNo||'-')}</span></div><div class="apd-field"><span class="apd-label">วันที่</span><span class="apd-value">${esc(r.requestDate||'-')}</span></div><div class="apd-field"><span class="apd-label">ผู้แจ้ง</span><span class="apd-value">${esc(r.requesterNameSnapshot||'-')}</span></div><div class="apd-field"><span class="apd-label">หน่วยงาน</span><span class="apd-value">${esc(a.unitName||'-')}</span></div><div class="apd-field"><span class="apd-label">ความเร่งด่วน</span><span class="apd-value"><span class="apd-urgency ${urgency.cls}">${esc(urgency.label)}</span></span></div><div class="apd-field apd-wide"><span class="apd-label">อาการ / เหตุผล</span><span class="apd-value">${esc(r.issue||'-')}</span></div><div class="apd-field apd-wide"><span class="apd-label">หมายเหตุ</span><span class="apd-value">${esc(r.requestNote||'-')}</span></div></div></section>
    <section class="apd-card"><div class="apd-card-head"><span class="apd-icon">🚙</span><span>B. ทรัพย์สิน</span></div><div class="apd-card-body apd-asset-wrap">${assetPhoto}<div class="apd-grid"><div class="apd-field"><span class="apd-label">รหัส</span><span class="apd-value">${esc(a.code||'-')}</span></div><div class="apd-field"><span class="apd-label">ทะเบียน / ชื่อ</span><span class="apd-value"><b>${esc(a.plate||'-')}</b></span></div><div class="apd-field"><span class="apd-label">ยี่ห้อ / รุ่น</span><span class="apd-value">${esc(`${a.brandName||''} ${a.modelName||''}`.trim()||'-')}</span></div><div class="apd-field"><span class="apd-label">ปี</span><span class="apd-value">${esc(a.modelYear||'-')}</span></div><div class="apd-field"><span class="apd-label">เลขไมล์ล่าสุด</span><span class="apd-value">${esc(a.mileage===''?'-':a.mileage)} ${esc(a.meterUnit||'')}</span></div><div class="apd-field"><span class="apd-label">บริษัท</span><span class="apd-value">${esc(a.companyName||'-')}</span></div><div class="apd-field apd-wide"><span class="apd-label">หน่วยดูแล</span><span class="apd-value">${esc(a.unitName||'-')}</span></div></div></div></section>
    <section class="apd-card"><div class="apd-card-head"><span class="apd-icon">🔧</span><span>C. ข้อเสนอซ่อม</span></div><div class="apd-card-body apd-grid"><div class="apd-field apd-wide"><span class="apd-label">คำอธิบาย</span><span class="apd-value">${esc(r.issue||'-')}</span></div><div class="apd-field"><span class="apd-label">ผู้ให้บริการที่เสนอ</span><span class="apd-value">${esc(p.vendorNameSnapshot||'-')}</span></div><div class="apd-field"><span class="apd-label">ติดต่อ</span><span class="apd-value">${esc(p.vendorContact||'-')}</span></div><div class="apd-field apd-wide"><span class="apd-label">ประมาณการ</span><span class="apd-value"><b>${money(p.estimatedCost)} บาท</b></span></div></div></section>
    <section class="apd-card"><div class="apd-card-head"><span class="apd-icon">📊</span><span>D. ประวัติการซ่อม</span></div><div class="apd-card-body">${repairHistoryPrintHtml(h)}</div></section>
    <section class="apd-card"><div class="apd-card-head"><span class="apd-icon">☑</span><span>E. ผลอนุมัติภายนอก</span></div><div class="apd-card-body apd-approval"><div><div class="apd-choices"><span class="apd-choice">□ อนุมัติ</span><span class="apd-choice">□ ไม่อนุมัติ</span><span class="apd-choice">□ อนุมัติแบบมีเงื่อนไข</span></div><div class="apd-lines">วงเงินที่อนุมัติ ______________________________ บาท<br>หมายเหตุ ____________________________________________</div></div><div class="apd-signature"><div>ผู้อนุมัติ ______________________________</div><div>วันที่ _________________________________</div><div class="apd-sign-line">ลายเซ็นผู้อนุมัติ</div></div></div></section>
    <footer class="apd-footer">เอกสารนี้จัดทำจากระบบอิเล็กทรอนิกส์ · พิมพ์เมื่อ ${esc(doc.generatedAt||'-')}</footer></div>`;
  }

  function dataMime(data){const m=String(data||'').match(/^data:([^;,]+)/i);return String(m?.[1]||'').toLowerCase();}
  function extensionForMime(mime){return ({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/gif':'gif','image/webp':'webp'})[mime]||'bin';}
  function closeViewer(){const old=typeof document!=='undefined'?document.querySelector?.('#apdViewerOverlay'):null;if(old?.remove)old.remove();}
  function openViewer({title='เอกสาร',data='',mime='',fileName='',html=''}){
    if(typeof document==='undefined'||!document?.createElement||!document?.body?.appendChild)throw Error('ไม่สามารถเปิดตัวแสดงเอกสารได้');
    closeViewer();
    const overlay=document.createElement('div');overlay.id='apdViewerOverlay';overlay.className='v48-viewer';
    const actualMime=String(mime||dataMime(data)).toLowerCase();
    const isImg=actualMime.startsWith('image/')||/^data:image\//i.test(data);
    const safeTitle=esc(title||'เอกสาร'),bodyHtml=html||(isImg?`<img src="${data}" alt="${safeTitle}">`:`<iframe src="${data}" title="${safeTitle}"></iframe>`);
    let downloadData=data,downloadName=fileName;
    if(html&&!downloadData){downloadData=`data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html><html><head><meta charset="utf-8"><title>${title||'เอกสาร'}</title><link rel="stylesheet" href="styles.css"></head><body>${html}</body></html>`)}`;downloadName=downloadName||'approval-document.html';}
    if(downloadData&&!downloadName)downloadName=`returned-approval.${extensionForMime(actualMime||dataMime(downloadData))}`;
    overlay.innerHTML=`<div class="v48-viewer-card"><div class="v48-viewer-head"><div><b>${safeTitle}</b><small>${html?'เอกสารขออนุมัติซ่อม':'ไฟล์แนบผลอนุมัติจากภายนอก'}</small></div><button type="button" data-apd-viewer-close>×</button></div><div class="v48-viewer-body">${bodyHtml}</div><div class="v48-viewer-foot">${downloadData?`<a class="btn" href="${downloadData}" download="${esc(downloadName)}">ดาวน์โหลดไฟล์</a>`:''}<button type="button" class="btn primary" data-apd-viewer-close>ปิด</button></div></div>`;
    document.body.appendChild(overlay);
    const sheet=overlay.querySelector?.('.print-sheet');if(sheet?.style)sheet.style.display='block';
    overlay.querySelectorAll?.('[data-apd-viewer-close]').forEach(b=>b.onclick=()=>overlay.remove());
    overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
    return overlay;
  }

  function viewReturnedAttachmentById(attachmentId){
    ensureApprovalState();const att=STATE.returnedApprovalAttachments.find(x=>x&&x.id===attachmentId);if(!att?.fileRef)throw Error('ไม่พบไฟล์แนบกลับ');
    const mime=dataMime(att.fileRef);
    return openViewer({title:'ไฟล์แนบผลอนุมัติ',data:att.fileRef,mime,fileName:`returned-approval.${extensionForMime(mime)}`});
  }

  function viewDocument(doc){
    if(!doc)throw Error('ไม่พบเอกสาร');
    return openViewer({title:doc.documentNo||'ใบขออนุมัติซ่อม',html:printSheetHtml(doc),fileName:`${doc.documentNo||'approval-document'}.html`});
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
    $$('[data-apd-returned-attachment]').forEach(b=>b.onclick=()=>{try{viewReturnedAttachmentById(b.dataset.apdReturnedAttachment)}catch(e){toast(e.message||String(e),true)}});
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
  window.FLEET_MAINTENANCE_APPROVAL_DOCUMENT_TEST={ensureApprovalState,canManage,actor,repairHistory,buildSnapshot,generateApprovalDocument,saveExternalApprovalResult,hasLinkedWorkOrder,hasApprovedResult,approvalPanelsHtml,printSheetHtml,repairHistoryPrintHtml,wrappedRequestDetail,originalRequestDetail,workOrderCost,docsForRequest,resultForRequest,appendApprovalPanels,restoreApprovalPanelsIfNeeded,approvalObserver,getActiveRequestId:()=>activeRequestId,viewDocument,viewDocumentById,resultForm,openViewer,closeViewer,viewReturnedAttachmentById,dataMime,extensionForMime};
})();