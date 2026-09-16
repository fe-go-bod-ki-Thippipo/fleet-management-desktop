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

  function requestPanel(){
    if(typeof content==='undefined'||!content||typeof content.querySelectorAll!=='function')return null;
    const panels=Array.from(content.querySelectorAll('.panel')||[]);
    return panels.find(panel=>{
      const heading=panel?.querySelector?.('h3');
      return heading&&String(heading.textContent||'').trim()==='คำขอแจ้งซ่อม';
    })||null;
  }

  function appendQuickRequestButton(a){
    if(typeof assetTab==='undefined'||assetTab!=='maintenance'||!a||!canQuickRequest())return;
    if(typeof content==='undefined'||!content)return;
    if(content.querySelector?.('#assetQuickMaintenanceRequest'))return;
    const panel=requestPanel();
    const heading=panel?.querySelector?.('h3');
    if(!heading||typeof heading.insertAdjacentHTML!=='function')return;
    const html='<span class="toolbar" id="assetQuickMaintenanceRequest" style="float:right;margin-top:-36px"><button class="btn primary" id="assetQuickMaintenanceRequestBtn">+ แจ้งซ่อม</button></span>';
    heading.insertAdjacentHTML('afterend',html);
    const btn=content.querySelector?.('#assetQuickMaintenanceRequestBtn')||(typeof $==='function'?$('#assetQuickMaintenanceRequestBtn'):null);
    if(btn)btn.onclick=()=>requestApi()?.requestForm?.('',{assetId:a.id});
  }

  function wrappedRenderAssetTab(a){
    const result=capturedRenderAssetTab?capturedRenderAssetTab(a):undefined;
    appendQuickRequestButton(a);
    return result;
  }

  if(capturedRenderAssetTab)renderAssetTab=wrappedRenderAssetTab;

  if(typeof window!=='undefined')window.FLEET_MAINTENANCE_ASSET_QUICK_REQUEST_TEST={capturedRenderAssetTab,wrappedRenderAssetTab,appendQuickRequestButton,canQuickRequest,requestPanel};
})();
