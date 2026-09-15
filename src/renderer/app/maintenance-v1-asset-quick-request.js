/* Maintenance Workflow v1 — Asset Detail quick MaintenanceRequest integration. */
(function(){
  const capturedRenderAssetTab=typeof renderAssetTab==='function'?renderAssetTab:null;

  function requestApi(){
    return typeof window!=='undefined'?window.FLEET_MAINTENANCE_REQUEST_TEST:undefined;
  }

  function canQuickRequest(){
    const api=requestApi();
    return Boolean(api&&typeof api.canCreate==='function'&&api.canCreate()&&typeof api.requestForm==='function');
  }

  function appendQuickRequestButton(a){
    if(typeof assetTab==='undefined'||assetTab!=='maintenance'||!a||!canQuickRequest())return;
    if(typeof content==='undefined'||!content)return;
    if(content.querySelector?.('#assetQuickMaintenanceRequest'))return;
    const html='<div class="toolbar" id="assetQuickMaintenanceRequest" style="justify-content:flex-end;margin:0 0 12px"><button class="btn primary" id="assetQuickMaintenanceRequestBtn">+ แจ้งซ่อม</button></div>';
    if(typeof content.insertAdjacentHTML==='function')content.insertAdjacentHTML('afterbegin',html);
    else content.innerHTML=html+(content.innerHTML||'');
    const btn=content.querySelector?.('#assetQuickMaintenanceRequestBtn')||(typeof $==='function'?$('#assetQuickMaintenanceRequestBtn'):null);
    if(btn)btn.onclick=()=>requestApi()?.requestForm?.('',{assetId:a.id});
  }

  function wrappedRenderAssetTab(a){
    const result=capturedRenderAssetTab?capturedRenderAssetTab(a):undefined;
    appendQuickRequestButton(a);
    return result;
  }

  if(capturedRenderAssetTab)renderAssetTab=wrappedRenderAssetTab;

  if(typeof window!=='undefined')window.FLEET_MAINTENANCE_ASSET_QUICK_REQUEST_TEST={capturedRenderAssetTab,wrappedRenderAssetTab,appendQuickRequestButton,canQuickRequest};
})();
