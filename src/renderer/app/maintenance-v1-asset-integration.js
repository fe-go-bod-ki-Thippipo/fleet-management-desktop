/* Maintenance Workflow v1 — Batch 4: Asset Detail integration.
   Additive wrapper only; locked renderAssetTab implementation remains untouched. */
(function(){
  const originalRenderAssetTab=typeof renderAssetTab==='function'?renderAssetTab:null;

  function requestApi(){return window.FLEET_MAINTENANCE_REQUEST_TEST||null;}
  function requestStatusLabel(s){return ({draft:'ร่าง',document_printed:'พิมพ์เอกสารแล้ว',approved:'อนุมัติ',rejected:'ไม่อนุมัติ',cancelled:'ยกเลิก'})[s]||s||'-';}
  function requestUrgencyLabel(s){return ({low:'ต่ำ',normal:'ปกติ',high:'สูง',critical:'เร่งด่วนมาก'})[s]||s||'-';}
  function assetMaintenanceRequests(assetId){
    const rows=Array.isArray(STATE?.maintenanceRequests)?STATE.maintenanceRequests:[];
    return rows.filter(r=>r&&r.assetId===assetId);
  }
  function requestTableHtml(a){
    const rows=assetMaintenanceRequests(a?.id);
    if(!rows.length)return '<div class="panel"><h3>คำขอแจ้งซ่อม</h3><div class="empty">ยังไม่มีคำขอแจ้งซ่อม</div></div>';
    const api=requestApi();
    return `<div class="panel"><h3>คำขอแจ้งซ่อม</h3><table><thead><tr><th>เลขที่คำขอ</th><th>วันที่</th><th>อาการ</th><th>ความเร่งด่วน</th><th>สถานะ</th><th>มี Work Order แล้วหรือไม่</th></tr></thead><tbody>${rows.map(r=>`<tr data-asset-mr-row="${esc(r.id)}"><td><b>${esc(r.requestNo||'-')}</b></td><td>${esc(r.requestDate||'-')}</td><td>${esc(r.issue||'-')}</td><td>${esc(requestUrgencyLabel(r.urgency))}</td><td>${typeof pill==='function'?pill(r.status):esc(requestStatusLabel(r.status))} ${esc(requestStatusLabel(r.status))}</td><td>${api?.workOrderBadge?api.workOrderBadge(r):'<span class="pill warn">ยังไม่มี</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function bindRequestRows(){
    const api=requestApi();
    $$('[data-asset-mr-row]').forEach(row=>row.onclick=()=>api?.requestDetail?.(row.dataset.assetMrRow));
  }
  function wrappedRenderAssetTab(a){
    if(originalRenderAssetTab)originalRenderAssetTab(a);
    if(assetTab!=='maintenance')return;
    const box=$('#assetTab');if(!box)return;
    box.insertAdjacentHTML('beforeend',requestTableHtml(a));
    bindRequestRows();
  }

  if(originalRenderAssetTab){renderAssetTab=wrappedRenderAssetTab;window.renderAssetTab=wrappedRenderAssetTab;}
  window.FLEET_MAINTENANCE_ASSET_INTEGRATION_TEST={originalRenderAssetTab,wrappedRenderAssetTab,assetMaintenanceRequests,requestTableHtml,requestStatusLabel,requestUrgencyLabel};
})();
