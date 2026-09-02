/* Latest Asset Detail requirements: remove duplicate summary/timeline and enrich Audit. */
(function(){
  const previousAssetProfile=assetProfile;
  const REQUIRED_DOCS=[['tax','ภาษีรถ'],['act','พ.ร.บ.'],['insurance','ประกันภัย']];
  const BASIC_LABELS={code:'รหัส',plate:'ทะเบียน/ชื่อ',assetCategory:'กลุ่มทรัพย์สิน',companyId:'บริษัท',ownerId:'เจ้าของ',homeOperatingUnitId:'Home Unit',managingOperatingUnitId:'Managing Unit',typeName:'ประเภท',brandName:'ยี่ห้อ'};
  function activeDocs(assetId){return (STATE.documents||[]).filter(d=>d.assetId===assetId&&!d.deleted&&d.status!=='inactive'&&d.status!=='superseded')}
  function basicCompleteness(a){const c=pCompleteness(a);return {score:c.score,missing:c.missing.map(k=>BASIC_LABELS[k]||k)}}
  function importantDocCount(a){const docs=activeDocs(a.id);return REQUIRED_DOCS.filter(([type])=>docs.some(d=>d.type===type)).length}
  function escJson(v){if(v===undefined||v===null)return '-';if(typeof v==='string')return esc(v||'-');try{return esc(JSON.stringify(v,null,2))}catch{return esc(String(v))}}
  function auditDetail(a){
    const box=$('#assetTab'); if(!box)return;
    const logs=(STATE.audit||[]).filter(x=>x.recordId===a.id).sort((x,y)=>String(y.ts||'').localeCompare(String(x.ts||'')));
    box.innerHTML=`<div class="panel"><div class="toolbar"><div class="left"><input id="assetAuditQ" placeholder="ค้นหาการทำรายการ / ผู้ดำเนินการ"><select id="assetAuditAction"><option value="">ทุกประเภทเหตุการณ์</option>${[...new Set(logs.map(x=>x.action).filter(Boolean))].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select><input id="assetAuditFrom" type="date" title="ตั้งแต่วันที่"><input id="assetAuditTo" type="date" title="ถึงวันที่"><button class="btn" id="assetAuditReset">↻ ล้างตัวกรอง</button></div></div><div id="assetAuditRows"></div></div>`;
    const draw=()=>{const q=$('#assetAuditQ').value.toLowerCase(),action=$('#assetAuditAction').value,from=$('#assetAuditFrom').value,to=$('#assetAuditTo').value;const rows=logs.filter(l=>(!q||`${l.action||''} ${l.user||''} ${l.entity||''} ${l.reason||''}`.toLowerCase().includes(q))&&(!action||l.action===action)&&(!from||String(l.ts||'').slice(0,10)>=from)&&(!to||String(l.ts||'').slice(0,10)<=to));$('#assetAuditRows').innerHTML=rows.map(l=>`<details class="audit-detail-row"><summary><div><b>${esc(l.action||'การเปลี่ยนแปลง')}</b><span>${esc(l.ts||'-')} · ${esc(l.user||'-')}</span></div><small>${esc(l.entity||'asset')}${l.reason?` · ${esc(l.reason)}`:''}</small></summary><div class="audit-expanded"><div><b>ข้อมูลก่อนแก้ไข</b><pre>${escJson(l.before)}</pre></div><div><b>ข้อมูลหลังแก้ไข</b><pre>${escJson(l.after)}</pre></div></div></details>`).join('')||'<div class="empty">ไม่พบประวัติที่ตรงกับตัวกรอง</div>'};
    $('#assetAuditQ').oninput=draw;$('#assetAuditAction').onchange=draw;$('#assetAuditFrom').onchange=draw;$('#assetAuditTo').onchange=draw;$('#assetAuditReset').onclick=()=>{$('#assetAuditQ').value='';$('#assetAuditAction').value='';$('#assetAuditFrom').value='';$('#assetAuditTo').value='';draw()};draw();
  }
  assetProfile=function(id){
    previousAssetProfile(id);
    const a=(STATE.assets||[]).find(x=>x.id===id&&!x.deleted); if(!a)return;
    const basic=basicCompleteness(a),docCount=importantDocCount(a);
    const heroInfo=document.querySelector('.hero-info');
    if(heroInfo){
      const completeness=[...heroInfo.querySelectorAll('.kv')].find(k=>k.querySelector('span')?.textContent.trim()==='ความครบถ้วน');
      if(completeness){completeness.querySelector('span').textContent='ข้อมูลพื้นฐาน';completeness.querySelector('b').textContent=`${basic.score}%`;completeness.insertAdjacentHTML('afterend',`<div class="kv"><span>เอกสารสำคัญ</span><b>${docCount}/${REQUIRED_DOCS.length} รายการ</b></div>`)}
    }
    const warn=document.querySelector('.hero .warn-box');if(warn)warn.innerHTML=`ข้อมูลพื้นฐานยังไม่ครบ: ${esc(basic.missing.join(', '))}`;
    if(assetTab==='general'){
      document.querySelectorAll('.asset-general-side').forEach(x=>x.remove());
      const grid=document.querySelector('#assetTab .grid2');
      if(grid){[...grid.children].forEach(x=>{if(x.querySelector('h3')?.textContent.trim()==='Timeline ล่าสุด')x.remove()});grid.style.gridTemplateColumns='1fr'}
    }
    if(assetTab==='audit')auditDetail(a);
  };
})();
