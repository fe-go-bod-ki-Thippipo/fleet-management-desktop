/* v0.4.7 Asset Baseline Fix — REQ-01A/01B/05/08/09/10 + BUG-v046-01 */
(function(){
 const E=v=>esc(String(v??''));
 const typeOf=d=>d?.type||STATE.masters.documentTypes.find(x=>x.id===d?.documentTypeId)?.key||'other';
 const att=d=>d?.attachment||((d?.attachmentData||d?.attachmentName)?{name:d.attachmentName||'เอกสารแนบ',type:d.attachmentType||'',data:d.attachmentData||''}:null);
 const days=d=>{if(!d?.expiryDate)return null;const x=new Date(d.expiryDate+'T00:00:00'),t=new Date(today()+'T00:00:00');return Number.isNaN(x.getTime())?null:Math.ceil((x-t)/86400000)};
 const isAdmin=()=>{const u=typeof pCurrentUser==='function'?pCurrentUser():null;return !!(u&&(u.role==='admin'||u.roleId==='ROLE-ADMIN'||u.isAdmin))||String(window.CURRENT_ROLE||'').toLowerCase()==='admin'};
 function peers(d){return (STATE.documents||[]).filter(x=>!x.deleted&&x.assetId===d.assetId&&typeOf(x)===typeOf(d))}
 function prev(d){return d.previousVersionId?(STATE.documents||[]).find(x=>!x.deleted&&x.id===d.previousVersionId):null}
 function next(d){return d.supersededById?(STATE.documents||[]).find(x=>!x.deleted&&x.id===d.supersededById):null}
 function current(d){let x=d,n=next(x),seen=new Set([x.id]);while(n&&!seen.has(n.id)){seen.add(n.id);x=n;n=next(x)}return x}
 function normalizeChain(root){let chain=[],x=root,seen=new Set();while(x&&!seen.has(x.id)){seen.add(x.id);chain.push(x);x=next(x)}chain.forEach((d,i)=>{d.version=i+1;d.previousVersionId=i?chain[i-1].id:null;d.supersededById=i<chain.length-1?chain[i+1].id:null;d.status=i<chain.length-1?'superseded':'active'});return chain}
 function openAttachment(d){const a=att(d);if(!a?.data)return toast('ไม่พบไฟล์แนบ',true);try{const w=window.open(a.data,'_blank');if(!w){const el=document.createElement('a');el.href=a.data;el.target='_blank';el.rel='noopener';el.click()}}catch(e){toast('ไม่สามารถเปิดไฟล์แนบได้',true)}}
 window.v47OpenAttachment=openAttachment;
 window.v47NormalizeDocumentChain=function(id){const d=(STATE.documents||[]).find(x=>x.id===id&&!x.deleted);if(!d)return[];let r=d,p=prev(r),seen=new Set();while(p&&!seen.has(r.id)){seen.add(r.id);r=p;p=prev(r)}return normalizeChain(r)};
 const oldRenew=window.renewDocument;
 window.renewDocument=function(docOrId){const source=typeof docOrId==='string'?(STATE.documents||[]).find(x=>x.id===docOrId):docOrId;if(!source)return toast('ไม่พบเอกสารต้นทาง',true);normalizeChain((()=>{let r=source,p=prev(source),s=new Set();while(p&&!s.has(r.id)){s.add(r.id);r=p;p=prev(r)}return r})());return oldRenew(source)};
 const oldDetail=window.assetDocumentDetail;
 window.assetDocumentDetail=function(id){const d=(STATE.documents||[]).find(x=>x.id===id&&!x.deleted);if(!d)return toast('ไม่พบเอกสาร',true);oldDetail(id);setTimeout(()=>{
   const p=prev(d),n=next(d),sec=[...dialog.querySelectorAll('section')].find(s=>s.querySelector('h3')?.textContent.includes('ประวัติเวอร์ชัน'));
   if(sec)sec.innerHTML=`<h3>ความสัมพันธ์เวอร์ชัน</h3><div class="v47-chain-nav">${p?`<button class="btn" data-v47-prev>← เวอร์ชันก่อนหน้า v${Number(p.version)||1}</button>`:''}<b>v${Number(d.version)||1}</b>${n?`<button class="btn" data-v47-next>เวอร์ชันถัดไป v${Number(n.version)||1} →</button>`:''}</div>`;
   dialog.querySelector('[data-v47-prev]')?.addEventListener('click',()=>assetDocumentDetail(p.id));dialog.querySelector('[data-v47-next]')?.addEventListener('click',()=>assetDocumentDetail(n.id));
   const b=dialog.querySelector('[data-open-att]');if(b){b.onclick=e=>{e.preventDefault();openAttachment(d)}}
 },0)};
 window.v47DeleteDocument=function(id){const d=(STATE.documents||[]).find(x=>x.id===id&&!x.deleted);if(!d)return;if(!isAdmin())return toast('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ลบเอกสารได้',true);if(!confirm(`ยืนยันลบเอกสาร ${docType(typeOf(d))} v${d.version||1}?\nข้อมูลจะถูก Soft Delete และเก็บใน Audit Log`))return;const before=structuredClone(d),p=prev(d),n=next(d);d.deleted=true;d.deletedAt=now();d.deletedBy=pCurrentUser?.()?.id||'ADMIN';if(p)p.supersededById=n?.id||null;if(n)n.previousVersionId=p?.id||null;if(p||n){let r=p||n,q=prev(r),s=new Set();while(q&&!s.has(r.id)){s.add(r.id);r=q;q=prev(r)}normalizeChain(r)}pAudit('ลบเอกสาร','document',d.id,before,structuredClone(d),`Admin soft delete ${d.id}`);save(false);documentPage();toast('ลบเอกสารแล้ว')};
 const oldRender=window.renderDocTable;
 window.renderDocTable=function(box,docs){oldRender(box,docs);setTimeout(()=>{
  const table=box.querySelector('table');if(!table)return;const hs=[...table.querySelectorAll('thead th')];const exp=hs.findIndex(x=>x.textContent.includes('วันหมดอายุ'));if(exp>=0){const h=document.createElement('th');h.textContent='ใกล้หมดอายุ (วัน)';hs[exp].after(h);[...table.querySelectorAll('tbody tr')].forEach((tr,i)=>{const d=docs[i],td=document.createElement('td'),n=days(d);td.className=n==null?'':n<0?'v47-expired':n<=30?'v47-expiring':'v47-days';td.textContent=n==null?'-':n<0?`หมดอายุ ${Math.abs(n)} วัน`:`${n} วัน`;tr.children[exp]?.after(td);const manage=tr.lastElementChild;if(manage&&isAdmin()){const del=document.createElement('button');del.className='btn danger v47-delete';del.textContent='ลบ';del.onclick=e=>{e.stopPropagation();v47DeleteDocument(d.id)};manage.appendChild(del)}const link=[...tr.querySelectorAll('button,a')].find(x=>x.textContent.includes('เปิดไฟล์'));if(link)link.onclick=e=>{e.preventDefault();e.stopPropagation();openAttachment(d)}})}
 },0)};
 window.ASSET_BASELINE_FIX_V047=true;
})();