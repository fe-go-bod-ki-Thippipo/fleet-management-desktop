/* Maintenance Workflow v1 — Batch 4: maintenance hub.
   Captures the already-patched Batch 2 maintenancePage before reassignment. */
(function(){
  const capturedLegacyMaintenancePage=typeof maintenancePage==='function'?maintenancePage:null;
  let mtab='requests';
  const role=()=>typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'';
  const knownRoles=new Set(['admin','manager','fleetOfficer','clerk','requester','viewer']);
  const canView=()=>knownRoles.has(role());

  function ensureHubState(){
    if(typeof STATE!=='object'||!STATE)return;
    STATE.maintenance??=[];STATE.pmPlans??=[];STATE.workOrders??=[];
  }
  function tabsHtml(){return `<div class="tabs">${[['requests','คำขอซ่อม'],['jobs','งานซ่อม'],['pm','แผน PM']].map(([k,l])=>`<button data-mtab="${k}" class="${mtab===k?'active':''}">${l}</button>`).join('')}</div>`;}

  function jobsHtml(){
    ensureHubState();
    const rows=STATE.workOrders||[];
    if(rows.length)return `<div class="panel"><h3>งานซ่อม</h3>${simpleTable(rows,[[x=>x.workOrderNo||x.no||x.id,'เลขที่'],[x=>typeof assetLabel==='function'?assetLabel(x.assetId):x.assetId,'ทรัพย์สิน'],['status','สถานะ']])}</div>`;
    const legacy=STATE.maintenance||[];
    return `<div class="panel"><h3>งานซ่อม</h3>${legacy.length?simpleTable(legacy,[['no','เลขที่'],[x=>typeof assetLabel==='function'?assetLabel(x.assetId):x.assetId,'ทรัพย์สิน'],['issue','อาการ/งาน'],[x=>String(x.vendorNameSnapshot||x.vendor||'-'),'ผู้ให้บริการ'],['status','สถานะ'],['cost','ค่าใช้จ่าย']]):'<div class="empty">ยังไม่มีข้อมูล</div>'}<div class="muted" style="margin-top:8px">Batch 4 แสดงข้อมูลเดิมแบบอ่านอย่างเดียวจนกว่า WorkOrder migration จะ merge</div></div>`;
  }

  function pmHtml(){
    ensureHubState();
    return `<div class="panel"><div class="toolbar"><h3>PM Plan</h3><button class="btn primary" id="hubNewPM">+ แผน PM</button></div>${simpleTable(STATE.pmPlans,[['name','แผน'],[x=>typeof assetLabel==='function'?assetLabel(x.assetId):x.assetId,'ทรัพย์สิน'],['triggerType','เกณฑ์'],['nextDue','กำหนดถัดไป']])}</div>`;
  }

  function maintenanceHubPage(){
    if(!canView()){setHead('ซ่อมบำรุง / PM');content.innerHTML='<div class="panel"><div class="empty">บทบาทนี้ไม่มีสิทธิ์ดูข้อมูลบำรุงรักษา</div></div>';return;}
    ensureHubState();setHead('ซ่อมบำรุง / PM','Maintenance Workflow');
    content.innerHTML=`${tabsHtml()}<div id="maintenanceHubBody"></div>`;
    $$('[data-mtab]').forEach(b=>b.onclick=()=>{mtab=b.dataset.mtab;maintenanceHubPage()});
    const host=$('#maintenanceHubBody');
    if(mtab==='requests'){
      if(window.FLEET_MAINTENANCE_REQUEST_TEST?.requestRegistry)window.FLEET_MAINTENANCE_REQUEST_TEST.requestRegistry(host);
      else host.innerHTML='<div class="panel"><div class="empty">Maintenance Request module ไม่พร้อมใช้งาน</div></div>';
    }else if(mtab==='jobs')host.innerHTML=jobsHtml();
    else if(mtab==='pm'){
      host.innerHTML=pmHtml();
      if($('#hubNewPM'))$('#hubNewPM').onclick=()=>typeof pmForm==='function'&&pmForm();
    }
  }

  if(capturedLegacyMaintenancePage){maintenancePage=maintenanceHubPage;window.maintenancePage=maintenanceHubPage;}

  window.FLEET_MAINTENANCE_HUB_TEST={capturedLegacyMaintenancePage,maintenanceHubPage,getTab:()=>mtab,setTab:v=>{mtab=v},jobsHtml,pmHtml,canView};
})();
