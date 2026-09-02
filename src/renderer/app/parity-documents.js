/* v0.13.4 document parity: dynamic fields, attachments and immutable renewal versions */
(function(){
 const docTypeKey=d=>d?.type||STATE.masters.documentTypes.find(x=>x.id===d?.documentTypeId)?.key||'other';
 const insurerOptions=selected=>'<option value="">- เลือกบริษัทประกัน -</option>'+pActive(STATE.masters.insuranceCompanies).map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('');
 const attachmentOf=d=>d?.attachment||((d?.attachmentData||d?.attachmentName)?{name:d.attachmentName||'เอกสารแนบ',type:d.attachmentType||'',data:d.attachmentData||''}:null);
 const readAttachment=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({name:file.name,type:file.type||'',size:file.size||0,data:r.result,addedAt:now()});r.onerror=rej;r.readAsDataURL(file)});
 function commonFields(d,assetId){return `<input type="hidden" name="id" value="${esc(d?.id||'')}">${selObj('รถ/เครื่องจักร','assetId',STATE.assets.filter(x=>!x.deleted),d?.assetId||assetId,'plate')}<label>ประเภทเอกสาร<select name="type" id="parityDocType">${STATE.masters.documentTypes.map(x=>`<option value="${esc(x.key)}" ${x.key===docTypeKey(d)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>${fld('เลขที่เอกสาร','docNo',d?.docNo||'')}${fld('วันที่ออก','issueDate',d?.issueDate||'',false,'date')}${fld('วันหมดอายุ','expiryDate',d?.expiryDate||'',true,'date')}`}
 function specific(type,d={}){
   if(type==='tax') return `<div class="wide doc-section"><b>ข้อมูลภาษีรถ</b></div>${fld('ค่าภาษี (บาท)','taxAmount',d.taxAmount??d.amount??'',false,'number')}${fld('วันที่ต่อภาษี/ชำระภาษี','taxPaidDate',d.taxPaidDate||d.renewalDate||'',false,'date')}`;
   if(type==='act') return `<div class="wide doc-section"><b>ข้อมูล พ.ร.บ.</b></div><label>บริษัทประกันภัย<select name="insuranceCompanyId">${insurerOptions(d.insuranceCompanyId||'')}</select></label>${fld('เลขกรมธรรม์','policyNo',d.policyNo||'')}${fld('วันเริ่มคุ้มครอง','coverageStart',d.coverageStart||'',false,'date')}${fld('วันสิ้นสุดคุ้มครอง','coverageEnd',d.coverageEnd||'',false,'date')}${fld('เบี้ย พ.ร.บ. (บาท)','premium',d.premium??'',false,'number')}`;
   if(type==='insurance') return `<div class="wide doc-section"><b>ข้อมูลประกันภัย</b></div><label>บริษัทประกันภัย<select name="insuranceCompanyId">${insurerOptions(d.insuranceCompanyId||'')}</select></label>${fld('เลขกรมธรรม์','policyNo',d.policyNo||'')}${fld('วันเริ่มคุ้มครอง','coverageStart',d.coverageStart||'',false,'date')}${fld('วันสิ้นสุดคุ้มครอง','coverageEnd',d.coverageEnd||'',false,'date')}${fld('เบี้ยประกัน (บาท)','premium',d.premium??'',false,'number')}${fld('ประเภท/ชั้นประกัน','insuranceClass',d.insuranceClass||'')}${fld('ทุนประกันภัย (บาท)','insuredAmount',d.insuredAmount??'',false,'number')}<label>เงื่อนไขซ่อม<select name="repairCondition"><option value="" ${!d.repairCondition?'selected':''}>- ไม่ระบุ -</option><option value="dealer" ${d.repairCondition==='dealer'?'selected':''}>ซ่อมห้าง</option><option value="garage" ${d.repairCondition==='garage'?'selected':''}>ซ่อมอู่</option></select></label>`;
   if(type==='inspect') return `<div class="wide doc-section"><b>ข้อมูลตรวจสภาพ</b></div>${fld('วันที่ตรวจสภาพ','inspectionDate',d.inspectionDate||d.issueDate||'',false,'date')}${fld('สถานที่/หน่วยตรวจ','inspectionProvider',d.inspectionProvider||'')}${fld('ผลการตรวจ','inspectionResult',d.inspectionResult||'')}`;
   return `<div class="wide doc-section"><b>ข้อมูลเอกสารอื่น</b></div>${fld('ชื่อ/หัวข้อเอกสาร','title',d.title||'')}`;
 }
 documentForm=function(d={},assetId=''){
   if(!pRequire('document.manage'))return; d=d||{};
   const oldAttachment=attachmentOf(d);
   const render=()=>commonFields(d,assetId)+`<div id="parityDocSpecific" class="wide form-grid">${specific(docTypeKey(d),d)}</div>${area('หมายเหตุ','note',d.note||'')}<label class="wide">ไฟล์ PDF / เอกสารแนบ${oldAttachment?`<small class="muted">ไฟล์ปัจจุบัน: ${esc(oldAttachment.name||'เอกสารแนบ')} · เลือกไฟล์ใหม่เพื่อแทนที่</small>`:''}<input type="file" name="attachment" id="parityDocFile" accept="application/pdf,image/*"></label>`;
   formModal(d.id?'แก้ไขเอกสาร':'เพิ่มเอกสาร',render(),async p=>{
     const before=d.id?structuredClone(d):null;
     let x=d.id?STATE.documents.find(y=>y.id===d.id):{id:uid('DOC'),version:Number(d.version)||1,createdAt:now(),deleted:false,status:'active'};
     ['taxAmount','premium','insuredAmount'].forEach(k=>{if(p[k]!==undefined&&p[k]!=='')p[k]=+p[k]});
     const file=dialog.querySelector('#parityDocFile')?.files?.[0];
     if(file){const att=await readAttachment(file);p.attachment=att;p.attachmentName=att.name;p.attachmentType=att.type;p.attachmentData=att.data;}
     else if(!d.id&&oldAttachment){p.attachment=structuredClone(oldAttachment);p.attachmentName=oldAttachment.name;p.attachmentType=oldAttachment.type;p.attachmentData=oldAttachment.data;}
     Object.assign(x,p,{version:Number(x.version||d.version)||1,updatedAt:now()});
     const mt=STATE.masters.documentTypes.find(t=>t.key===p.type);if(mt)x.documentTypeId=mt.id;
     if(!d.id)STATE.documents.push(x);
     pAudit(d.id?'แก้ไขเอกสาร':'เพิ่มเอกสาร','document',x.id,before,structuredClone(x),`Document type: ${p.type}; version: ${x.version}`);
     if(assetDetailId)assetTab='documents';
   });
   setTimeout(()=>{const type=dialog.querySelector('#parityDocType'),box=dialog.querySelector('#parityDocSpecific');if(type&&box)type.onchange=()=>{box.innerHTML=specific(type.value,{})}},0);
 };
 renewDocument=function(docOrId){if(!pRequire('document.manage'))return;const old=typeof docOrId==='string'?STATE.documents.find(x=>x.id===docOrId):docOrId;if(!old)return toast('ไม่พบเอกสารเดิม',true);const versions=STATE.documents.filter(x=>!x.deleted&&x.assetId===old.assetId&&docTypeKey(x)===docTypeKey(old));const nextVersion=Math.max(0,...versions.map(x=>Number(x.version)||1))+1;const draft={...structuredClone(old),id:'',version:nextVersion,previousVersionId:old.id,status:'active',issueDate:today(),expiryDate:'',attachment:null,attachmentName:'',attachmentType:'',attachmentData:'',createdAt:now(),updatedAt:now()};const originalForm=documentForm;documentForm(draft,old.assetId);const form=dialog.querySelector('form');if(!form)return;const originalSubmit=form.onsubmit;form.onsubmit=async e=>{const beforeOld=structuredClone(old);await originalSubmit(e);const newest=STATE.documents.filter(x=>x.assetId===old.assetId&&x.previousVersionId===old.id).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))[0];if(newest){newest.version=nextVersion;old.status='superseded';old.supersededById=newest.id;old.updatedAt=now();pAudit('ต่ออายุเอกสาร','document',newest.id,beforeOld,structuredClone(newest),`v${old.version||1} → v${nextVersion}`);save(false);if(assetDetailId)assetProfile(assetDetailId);else documentPage();}};
 };
})();
