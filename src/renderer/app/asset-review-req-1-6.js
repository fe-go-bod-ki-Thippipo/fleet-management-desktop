/* Asset review requirements 1-6 only. No unrelated module changes. */
(function(){
  const REQ_DOCS=[['tax','ภาษี'],['act','พ.ร.บ.'],['insurance','ประกัน']];
  const attOf=d=>d?.attachment||((d?.attachmentData||d?.attachmentName)?{name:d.attachmentName||'เอกสารแนบ',type:d.attachmentType||'',data:d.attachmentData||''}:null);
  const dispAsset=id=>{const a=(STATE.assets||[]).find(x=>x.id===id);return a?.plate||a?.name||'-'};
  const dayOf=d=>typeof pDocDays==='function'?pDocDays(d):null;
  const currentDoc=(assetId,type)=>{
    const rows=(STATE.documents||[]).filter(d=>!d.deleted&&d.assetId===assetId&&d.type===type&&d.status!=='inactive');
    return rows.sort((a,b)=>{
      const ac=a.status==='superseded'?0:1,bc=b.status==='superseded'?0:1;
      return bc-ac||(Number(b.version)||1)-(Number(a.version)||1)||String(b.expiryDate||'').localeCompare(String(a.expiryDate||''));
    })[0]||null;
  };
  const docState=(d,isLatest)=>{
    if(d.status==='inactive')return ['ปิดใช้งาน','muted'];
    if(d.status==='superseded'||!isLatest)return ['ฉบับเดิม','muted'];
    const days=dayOf(d);
    if(days!==null&&days<0)return ['หมดอายุ','bad'];
    if(days!==null&&days<=60)return ['ใกล้หมดอายุ','warn'];
    return ['ใช้งาน','ok'];
  };
  const stop=e=>e.stopPropagation();

  /* REQ-01: Asset Registry search keeps normal typing order/caret. */
  let assetSearchTimer=null;
  const reqPrevAssetsPage=assetsPage;
  assetsPage=function(){
    reqPrevAssetsPage();
    const q=document.querySelector('#v13AssetQ');
    if(!q)return;
    const end=q.value.length;
    q.focus({preventScroll:true});
    try{q.setSelectionRange(end,end)}catch(_){ }
    q.oninput=e=>{
      V13_ASSET_Q=e.target.value;
      V13_ASSET_PAGE=1;
      clearTimeout(assetSearchTimer);
      assetSearchTimer=setTimeout(()=>assetsPage(),180);
    };
  };

  /* REQ-02: Global search shows a result list; it never auto-opens the first Asset. */
  function globalMatches(text){
    const s=String(text||'').trim().toLowerCase();
    if(!s)return [];
    return (STATE.assets||[]).filter(a=>!a.deleted&&parityScopeAsset(a)&&`${a.code||''} ${a.plate||''} ${a.name||''} ${a.vin||''} ${a.brandName||''} ${a.modelName||''} ${a.typeName||''}`.toLowerCase().includes(s));
  }
  function renderGlobalResults(text){
    const rows=globalMatches(text);
    setHead('ผลการค้นหาทรัพย์สิน',`พบ ${rows.length} รายการสำหรับ “${text}”`);
    content.innerHTML=`<div class="panel global-result-panel"><div class="page-head-inline"><div><h2>ผลการค้นหา</h2><p class="muted">เลือกทรัพย์สินที่ต้องการเปิด · ระบบจะไม่เปิดรายการแรกอัตโนมัติ</p></div><span class="filter-chip">${esc(text)}</span></div><div class="table-wrap"><table class="interactive-table"><thead><tr><th>ทะเบียน/ชื่อ</th><th>ยี่ห้อ/รุ่น</th><th>ประเภท</th><th>หน่วยดูแล</th><th>สถานะ</th></tr></thead><tbody>${rows.map(a=>`<tr data-global-asset="${a.id}"><td><b>${esc(a.plate||a.name||'-')}</b><small>${esc(a.code||'')}</small></td><td>${esc(a.brandName||'-')} ${esc(a.modelName||'')}</td><td>${esc(a.typeName||a.assetCategory||'-')}</td><td>${esc(ouName(a.managingOperatingUnitId))}</td><td>${pill(a.status)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty">ไม่พบทรัพย์สินที่ตรงกับคำค้นหา</div></td></tr>'}</tbody></table></div></div>`;
    content.querySelectorAll('[data-global-asset]').forEach(r=>r.onclick=()=>{assetDetailId=r.dataset.globalAsset;assetTab='general';render()});
  }
  function wireGlobalSearch(){
    const q=document.querySelector('#globalSearch');
    if(!q)return;
    q.onkeydown=e=>{
      if(e.key!=='Enter')return;
      e.preventDefault();
      const s=q.value.trim();
      if(!s)return;
      renderGlobalResults(s);
    };
  }
  parityGlobalSearch=wireGlobalSearch;

  /* REQ-03: Global clear filter resets search, company and unit scopes. */
  function ensureGlobalReset(){
    const bar=document.querySelector('.top-actions');
    if(!bar||document.querySelector('#globalFilterReset'))return;
    const b=document.createElement('button');
    b.id='globalFilterReset';b.className='btn global-reset';b.textContent='↻ ล้างตัวกรอง';
    b.onclick=()=>{
      const q=document.querySelector('#globalSearch');if(q)q.value='';
      ACTIVE_COMPANY='ALL';ACTIVE_UNIT='ALL';
      if(STATE.settings){STATE.settings.currentCompany='ALL';STATE.settings.currentUnit='ALL'}
      if(typeof save==='function')save(false);
      const co=document.querySelector('#companyScope'),ou=document.querySelector('#unitScope');if(co)co.value='ALL';if(ou)ou.value='ALL';
      render();
    };
    const bell=document.querySelector('#notificationBtn');bar.insertBefore(b,bell||null);
  }

  /* REQ-04: Important-document cards click through to latest document, or create when missing. */
  function wireImportantCards(a){
    const hero=document.querySelector('.hero');if(!hero)return;
    REQ_DOCS.forEach(([type,label])=>{
      const candidates=[...hero.querySelectorAll('div')].filter(el=>el.textContent.trim().startsWith(label)&&el.textContent.trim().length<80);
      const card=candidates.sort((x,y)=>x.textContent.length-y.textContent.length)[0];if(!card)return;
      card.classList.add('important-doc-click');card.setAttribute('role','button');card.setAttribute('tabindex','0');
      const go=()=>{const d=currentDoc(a.id,type);if(d)assetDocumentDetail(d.id);else if(pCan('document.manage'))documentForm({type},a.id);else toast('ยังไม่มีเอกสารประเภทนี้',true)};
      card.onclick=go;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}};
    });
  }

  /* REQ-05: group Asset documents by type, latest/current first, historical/expired status explicit. */
  function groupedAssetDocs(box,docs){
    const order=['tax','act','insurance','inspect','other'];
    const groups=[...new Set([...order,...docs.map(d=>d.type)])].filter(t=>docs.some(d=>d.type===t));
    box.innerHTML=`<div class="asset-doc-groups">${groups.map(type=>{
      const rows=docs.filter(d=>d.type===type).sort((a,b)=>{
        const av=Number(a.version)||1,bv=Number(b.version)||1;
        const ac=a.status==='superseded'?0:1,bc=b.status==='superseded'?0:1;
        return bc-ac||bv-av||String(b.expiryDate||'').localeCompare(String(a.expiryDate||''));
      });
      const max=Math.max(...rows.map(d=>Number(d.version)||1));
      return `<section class="doc-type-group"><div class="doc-type-head"><h3>${esc(docType(type))}</h3><span>${rows.length} รายการ</span></div><div class="table-wrap"><table class="interactive-table"><thead><tr><th>เลขที่</th><th>วันหมดอายุ</th><th>ไฟล์แนบ</th><th>คงเหลือ</th><th>Version</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${rows.map(d=>{
        const days=dayOf(d),att=attOf(d),latest=(Number(d.version)||1)===max&&d.status!=='superseded';const [status,cls]=docState(d,latest);
        return `<tr data-doc-row="${d.id}" class="${latest?'doc-current':'doc-history'}"><td>${esc(d.docNo||'-')}</td><td>${esc(d.expiryDate||'-')}</td><td>${att?`<button class="attachment-link" data-attachment="${d.id}">${esc(att.name||'เปิดไฟล์')}</button>`:'-'}</td><td>${days==null?'-':days<0?`หมดอายุ ${Math.abs(days)} วัน`:`${days} วัน`}</td><td>v${d.version||1}</td><td><span class="doc-status ${cls}">${status}</span></td><td>${latest&&pCan('document.manage')?`<button class="btn sm" data-editdoc="${d.id}">แก้ไข</button> <button class="btn sm" data-renew="${d.id}">ต่ออายุ</button>`:'<span class="muted">อ่านอย่างเดียว</span>'}</td></tr>`;
      }).join('')}</tbody></table></div></section>`;
    }).join('')||'<div class="empty">ยังไม่มีเอกสาร</div>'}</div>`;
    box.querySelectorAll('[data-doc-row]').forEach(r=>r.onclick=()=>assetDocumentDetail(r.dataset.docRow));
    box.querySelectorAll('[data-editdoc]').forEach(b=>b.onclick=e=>{stop(e);documentForm(STATE.documents.find(x=>x.id===b.dataset.editdoc))});
    box.querySelectorAll('[data-renew]').forEach(b=>b.onclick=e=>{stop(e);renewDocument(STATE.documents.find(x=>x.id===b.dataset.renew))});
    box.querySelectorAll('[data-attachment]').forEach(b=>b.onclick=e=>{stop(e);assetDocumentDetail(b.dataset.attachment)});
  }

  const reqPrevDocDetail=window.assetDocumentDetail;
  window.assetDocumentDetail=function(id){
    reqPrevDocDetail(id);
    const d=(STATE.documents||[]).find(x=>x.id===id&&!x.deleted);if(!d)return;
    const peers=(STATE.documents||[]).filter(x=>!x.deleted&&x.assetId===d.assetId&&x.type===d.type&&x.status!=='inactive');
    const max=Math.max(0,...peers.filter(x=>x.status!=='superseded').map(x=>Number(x.version)||1));
    const latest=d.status!=='superseded'&&(Number(d.version)||1)===max;
    if(!latest){dialog.querySelector('[data-edit-detail]')?.remove();dialog.querySelector('[data-renew-detail]')?.remove();const actions=dialog.querySelector('.detail-actions');if(actions&&!actions.querySelector('.history-readonly'))actions.insertAdjacentHTML('afterbegin','<span class="history-readonly">ฉบับเดิม · อ่านอย่างเดียว</span>')}
  };

  /* REQ-06: cleaner Audit Trail with summary, filters, timeline, details and pagination. */
  let auditPageNo=1,auditSize=10,auditType='';
  function auditCategory(l){const s=`${l.action||''} ${l.entity||''}`.toLowerCase();if(s.includes('เอกสาร')||s.includes('document'))return 'document';if(s.includes('รูป')||s.includes('photo')||s.includes('file'))return 'file';if(s.includes('สร้าง')||s.includes('เพิ่ม')||s.includes('create'))return 'create';if(s.includes('ลบ')||s.includes('delete'))return 'delete';return 'edit'}
  function fmtAuditValue(v){if(v===undefined||v===null)return '-';if(typeof v==='object'){try{return JSON.stringify(v,null,2)}catch(_){return String(v)}}return String(v)}
  function renderAuditTrail(a){
    const box=document.querySelector('#assetTab');if(!box)return;
    const all=(STATE.audit||[]).filter(x=>x.recordId===a.id).sort((x,y)=>String(y.ts||'').localeCompare(String(x.ts||'')));
    const actors=new Set(all.map(x=>x.user).filter(Boolean));
    box.innerHTML=`<div class="audit-v45"><div class="audit-title-row"><div><h2>ประวัติการเปลี่ยนแปลง (Audit Trail)</h2><p class="muted">แสดงประวัติการดำเนินการทั้งหมดที่เกี่ยวข้องกับทรัพย์สินนี้</p></div><div class="audit-stats"><div><b>${all.length}</b><span>เหตุการณ์ทั้งหมด</span></div><div><b>${actors.size}</b><span>ผู้ดำเนินการ</span></div></div></div><div class="audit-filter-card"><div class="audit-filter-grid"><input id="a45q" placeholder="ค้นหาการทำรายการ / ผู้ดำเนินการ / รายละเอียด"><select id="a45action"><option value="">ทุกประเภทเหตุการณ์</option>${[...new Set(all.map(x=>x.action).filter(Boolean))].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select><input id="a45from" type="date"><input id="a45to" type="date"><button class="btn" id="a45reset">↻ ล้างตัวกรอง</button></div><div class="audit-chips">${[['','ทั้งหมด'],['create','สร้างข้อมูล'],['edit','แก้ไขข้อมูล'],['delete','ลบข้อมูล'],['file','แนบไฟล์/รูป'],['document','เอกสาร']].map(([k,l])=>`<button class="btn sm ${auditType===k?'active-filter':''}" data-a45type="${k}">${l}</button>`).join('')}</div></div><div class="audit-layout"><div id="a45rows" class="audit-timeline"></div><aside id="a45detail" class="audit-side"><div class="empty">เลือกรายการเพื่อดูรายละเอียด</div></aside></div><div class="pager audit-pager"><span id="a45count"></span><label>ต่อหน้า <select id="a45size"><option>10</option><option>20</option><option>50</option></select></label><div id="a45pages"></div></div></div>`;
    const draw=()=>{
      const q=document.querySelector('#a45q').value.toLowerCase(),action=document.querySelector('#a45action').value,from=document.querySelector('#a45from').value,to=document.querySelector('#a45to').value;
      let rows=all.filter(l=>(!q||`${l.action||''} ${l.user||''} ${l.entity||''} ${l.reason||''}`.toLowerCase().includes(q))&&(!action||l.action===action)&&(!auditType||auditCategory(l)===auditType)&&(!from||String(l.ts||'').slice(0,10)>=from)&&(!to||String(l.ts||'').slice(0,10)<=to));
      const pages=Math.max(1,Math.ceil(rows.length/auditSize));auditPageNo=Math.min(auditPageNo,pages);const start=(auditPageNo-1)*auditSize,shown=rows.slice(start,start+auditSize);
      document.querySelector('#a45rows').innerHTML=shown.map((l,i)=>`<button class="audit-event" data-a45idx="${start+i}"><span class="audit-dot ${auditCategory(l)}"></span><span class="audit-time">${esc(String(l.ts||'-').replace('T',' ').replace('Z',''))}</span><span class="audit-main"><b>${esc(l.action||'การเปลี่ยนแปลง')}</b><small>${esc(l.user||'-')}${l.reason?` · ${esc(l.reason)}`:''}</small></span><span class="audit-ref">${esc(l.entity||'asset')}</span></button>`).join('')||'<div class="empty">ไม่พบประวัติที่ตรงกับตัวกรอง</div>';
      document.querySelector('#a45count').textContent=`แสดง ${rows.length?start+1:0}–${Math.min(start+auditSize,rows.length)} จาก ${rows.length} รายการ`;
      document.querySelector('#a45pages').innerHTML=`<button class="btn sm" id="a45prev" ${auditPageNo<=1?'disabled':''}>ก่อนหน้า</button><span class="current-page">${auditPageNo} / ${pages}</span><button class="btn sm" id="a45next" ${auditPageNo>=pages?'disabled':''}>ถัดไป</button>`;
      document.querySelector('#a45prev').onclick=()=>{auditPageNo--;draw()};document.querySelector('#a45next').onclick=()=>{auditPageNo++;draw()};
      document.querySelectorAll('[data-a45idx]').forEach(btn=>btn.onclick=()=>{
        const l=rows[Number(btn.dataset.a45idx)];if(!l)return;
        document.querySelectorAll('.audit-event').forEach(x=>x.classList.toggle('active',x===btn));
        document.querySelector('#a45detail').innerHTML=`<div class="audit-side-head"><div><b>${esc(l.action||'การเปลี่ยนแปลง')}</b><small>${esc(l.user||'-')}</small></div></div><div class="audit-meta"><div><span>เวลา</span><b>${esc(l.ts||'-')}</b></div><div><span>ผู้ดำเนินการ</span><b>${esc(l.user||'-')}</b></div><div><span>ข้อมูลอ้างอิง</span><b>${esc(l.entity||'asset')}</b></div>${l.reason?`<div><span>รายละเอียด</span><b>${esc(l.reason)}</b></div>`:''}</div><h3>รายละเอียดการเปลี่ยนแปลง</h3><div class="audit-before-after"><div><span>ก่อนหน้า (Before)</span><pre>${esc(fmtAuditValue(l.before))}</pre></div><div><span>หลังจาก (After)</span><pre>${esc(fmtAuditValue(l.after))}</pre></div></div>`;
      });
    };
    ['a45q','a45action','a45from','a45to'].forEach(id=>document.querySelector('#'+id).addEventListener(id==='a45q'?'input':'change',()=>{auditPageNo=1;draw()}));
    document.querySelector('#a45reset').onclick=()=>{['a45q','a45action','a45from','a45to'].forEach(id=>document.querySelector('#'+id).value='');auditType='';auditPageNo=1;renderAuditTrail(a)};
    document.querySelectorAll('[data-a45type]').forEach(b=>b.onclick=()=>{auditType=b.dataset.a45type;auditPageNo=1;renderAuditTrail(a)});
    document.querySelector('#a45size').value=String(auditSize);document.querySelector('#a45size').onchange=e=>{auditSize=Number(e.target.value);auditPageNo=1;draw()};draw();
  }

  const reqPrevAssetProfile=assetProfile;
  assetProfile=function(id){
    reqPrevAssetProfile(id);
    const a=(STATE.assets||[]).find(x=>x.id===id&&!x.deleted);if(!a)return;
    wireImportantCards(a);
    if(assetTab==='documents'){const box=document.querySelector('#assetTab');if(box)groupedAssetDocs(box,(STATE.documents||[]).filter(d=>d.assetId===id&&!d.deleted))}
    if(assetTab==='audit')renderAuditTrail(a);
  };

  const reqPrevRefresh=parityRefreshShell;
  parityRefreshShell=function(){reqPrevRefresh();wireGlobalSearch();ensureGlobalReset()};
  setTimeout(()=>{wireGlobalSearch();ensureGlobalReset()},80);
})();
