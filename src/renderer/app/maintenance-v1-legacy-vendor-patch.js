/* Maintenance Workflow v1 — Batch 2: legacy Work Order Vendor Master patch.
   Additive-only wrapper. Does not modify part3.js or locked Asset/Document modules. */
(function(){
  const capturedLegacyMaintenanceForm=typeof maintenanceForm==='function'?maintenanceForm:null;
  const capturedLegacyMaintenancePage=typeof maintenancePage==='function'?maintenancePage:null;
  const norm=s=>String(s??'').trim().toLowerCase();
  const ensure=()=>{if(typeof STATE!=='object'||!STATE)return;STATE.vendors??=[];STATE.maintenance??=[];STATE.expenses??=[];STATE.assets??=[];STATE.pmPlans??=[];};
  const activeVendors=()=>{ensure();return STATE.vendors.filter(v=>v&&v.active===true&&v.deleted===false);};
  const vendorById=id=>{ensure();return STATE.vendors.find(v=>v&&v.id===id)||null;};
  const legacyVendorDisplay=wo=>String(wo?.vendorNameSnapshot||vendorById(wo?.vendorId)?.name||wo?.vendor||'-');

  function vendorSelectHtml(selected=''){
    const options=[['','- ไม่ระบุผู้ให้บริการ -'],...activeVendors().map(v=>[v.id,`${v.type==='internal'?'[ภายใน]':'[ภายนอก]'} ${v.name}`])];
    return sel('ผู้ให้บริการ / อู่','vendorId',options,selected);
  }

  function saveLegacyMaintenanceWithVendor(p){
    ensure();
    const vendorId=String(p.vendorId||'').trim();
    let vendor=null;
    if(vendorId){
      vendor=STATE.vendors.find(v=>v&&v.id===vendorId&&v.active===true&&v.deleted===false)||null;
      if(!vendor)throw Error('ผู้ให้บริการที่เลือกไม่พร้อมใช้งาน กรุณาเลือกใหม่');
    }
    const x={
      id:uid('WO'),
      no:`WO-${String(STATE.maintenance.length+1).padStart(4,'0')}`,
      ...p,
      vendorId,
      vendorNameSnapshot:vendor?.name||'',
      vendor:vendor?.name||'',
      cost:Number(p.cost)||0,
      createdAt:now()
    };
    STATE.maintenance.push(x);
    const asset=STATE.assets.find(a=>a.id===p.assetId);
    if(asset&&!['done','closed'].includes(p.status))asset.status='repair';
    if(x.cost)STATE.expenses.push({id:uid('EXP'),assetId:x.assetId,date:today(),type:'maintenance',sourceId:x.id,amount:x.cost,description:x.issue});
    save(true,'เปิดงานซ่อม','maintenance',x.id,null,x);
    return x;
  }

  function maintenanceFormWithVendor(){
    return formModal('เปิดงานซ่อม',
      `${selObj('ทรัพย์สิน','assetId',STATE.assets.filter(x=>!x.deleted),'','plate')}`+
      `${sel('ประเภท','maintenanceType',[['repair','ซ่อม'],['inspection','ตรวจสอบ'],['service','บำรุงรักษา']])}`+
      `${area('อาการ/รายละเอียด','issue')}`+
      `${fld('มิเตอร์','meterValue','',false,'number')}`+
      `${vendorSelectHtml()}`+
      `${fld('ค่าใช้จ่าย','cost','0',false,'number')}`+
      `${sel('สถานะ','status',[['new','ใหม่'],['checking','ตรวจสอบ'],['repairing','กำลังซ่อม'],['done','เสร็จ'],['closed','ปิดงาน']])}`,
      saveLegacyMaintenanceWithVendor
    );
  }

  function maintenancePageWithVendor(){
    ensure();
    setHead('ซ่อมบำรุง / PM');
    content.innerHTML=`<div class="grid2"><div class="panel"><div class="toolbar"><h3>Maintenance Work Order</h3><button class="btn primary" id="newWO">+ งานซ่อม</button></div>${simpleTable(STATE.maintenance,[['no','เลขที่'],[x=>assetLabel(x.assetId),'ทรัพย์สิน'],['issue','อาการ/งาน'],[x=>legacyVendorDisplay(x),'ผู้ให้บริการ'],['status','สถานะ'],['cost','ค่าใช้จ่าย']])}</div><div class="panel"><div class="toolbar"><h3>PM Plan</h3><button class="btn primary" id="newPM">+ แผน PM</button></div>${simpleTable(STATE.pmPlans,[['name','แผน'],[x=>assetLabel(x.assetId),'ทรัพย์สิน'],['triggerType','เกณฑ์'],['nextDue','กำหนดถัดไป']])}</div></div>`;
    $('#newWO').onclick=maintenanceForm;
    $('#newPM').onclick=pmForm;
  }

  if(capturedLegacyMaintenanceForm)maintenanceForm=maintenanceFormWithVendor;
  if(capturedLegacyMaintenancePage)maintenancePage=maintenancePageWithVendor;

  window.FLEET_MAINTENANCE_VENDOR_PATCH_TEST={
    capturedLegacyMaintenanceForm,
    capturedLegacyMaintenancePage,
    activeVendors,
    vendorById,
    legacyVendorDisplay,
    vendorSelectHtml,
    saveLegacyMaintenanceWithVendor,
    maintenanceFormWithVendor,
    maintenancePageWithVendor,
    norm
  };
})();
