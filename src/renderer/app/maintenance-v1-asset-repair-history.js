/* Maintenance Workflow v1 — Asset Detail WorkOrder repair history.
   Additive wrapper only; captures the current renderAssetTab wrapper chain and leaves locked implementations untouched. */
(function(){
  const originalRenderAssetTab=typeof renderAssetTab==='function'?renderAssetTab:null;
  const api=()=>typeof window!=='undefined'?window.FLEET_MAINTENANCE_WORKORDER_API:undefined;
  const safeEsc=v=>typeof esc==='function'?esc(v):String(v??'');
  const typeLabel=s=>({repair:'ซ่อม',inspection:'ตรวจสอบ',service:'บำรุงรักษา'})[s]||s||'-';
  const money=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});

  function closedWorkOrdersFor(assetId){
    const rows=Array.isArray(STATE?.workOrders)?STATE.workOrders:[];
    return rows.filter(w=>w&&w.assetId===assetId&&w.status==='closed')
      .slice().sort((a,b)=>String(b.closedAt||'').localeCompare(String(a.closedAt||'')));
  }
  function downtimeValue(id){
    const value=api()?.downtimeFor?.(id);
    return typeof value==='number'&&Number.isFinite(value)?`${Number.isInteger(value)?value:value.toFixed(1)} วัน`:'-';
  }
  function repairHistoryHtml(assetId){
    const workOrderApi=api();
    if(!workOrderApi)return '';
    const rows=closedWorkOrdersFor(assetId);
    if(!rows.length)return '';
    return `<div class="panel" data-asset-wo-history><h3>ประวัติการซ่อม (Work Order)</h3><table><thead><tr><th>เลขที่ WO</th><th>วันที่ปิดงาน</th><th>ประเภทงาน</th><th>ค่าใช้จ่ายรวม</th><th>Downtime</th></tr></thead><tbody>${rows.map(w=>`<tr data-asset-wo-row="${safeEsc(w.id)}"><td><b>${safeEsc(w.workOrderNo||w.id||'-')}</b></td><td>${safeEsc(String(w.closedAt||'-').slice(0,10))}</td><td>${safeEsc(typeLabel(w.maintenanceType))}</td><td>฿${money(workOrderApi.totalCostFor?.(w.id)??0)}</td><td>${safeEsc(downtimeValue(w.id))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function bindWorkOrderRows(box){
    const workOrderApi=api();
    if(!workOrderApi?.workOrderDetail)return;
    const rows=box?.querySelectorAll?.('[data-asset-wo-row]')||[];
    Array.from(rows).forEach(row=>row.onclick=()=>workOrderApi.workOrderDetail?.(row.dataset.assetWoRow));
  }
  function wrappedRenderAssetTab(a){
    if(originalRenderAssetTab)originalRenderAssetTab(a);
    if(typeof assetTab==='undefined'||assetTab!=='maintenance')return;
    const box=typeof $==='function'?$('#assetTab'):null;
    if(!box)return;
    const html=repairHistoryHtml(a?.id);
    if(!html)return;
    box.insertAdjacentHTML('beforeend',html);
    bindWorkOrderRows(box);
  }

  if(originalRenderAssetTab){renderAssetTab=wrappedRenderAssetTab;window.renderAssetTab=wrappedRenderAssetTab;}
  window.FLEET_MAINTENANCE_ASSET_REPAIR_HISTORY_TEST={originalRenderAssetTab,wrappedRenderAssetTab,closedWorkOrdersFor,repairHistoryHtml,downtimeValue,typeLabel};
})();
