/* Maintenance Blueprint v1 — Batch 1: Vendor Master foundation.
   Additive layer only: does not replace Asset/Document baseline functions. */
(function(){
  const canManageVendor=()=>['admin','manager','fleetOfficer'].includes(typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'admin');
  const canDeleteVendor=()=> (typeof CURRENT_ROLE==='string'?CURRENT_ROLE:'admin')==='admin';
  const norm=s=>String(s??'').trim().toLowerCase();

  function ensureVendorState(){
    if(!STATE)return;
    STATE.vendors??=[];
    STATE.vendors.forEach(v=>{
      if(v.active===undefined)v.active=true;
      if(v.deleted===undefined)v.deleted=false;
      v.source??='manual';
    });
  }

  const oldMigrate=typeof migrateState==='function'?migrateState:null;
  if(oldMigrate)migrateState=function(){oldMigrate();ensureVendorState();};

  function vendorDisplay(v){return v?.name||'-'}
  function nextVendorCode(){
    ensureVendorState();
    let n=1; while(STATE.vendors.some(v=>v.code===`VEN-${String(n).padStart(3,'0')}`))n++;
    return `VEN-${String(n).padStart(3,'0')}`;
  }
  function vendorDuplicate(name,excludeId=''){
    const key=norm(name);return STATE.vendors.some(v=>!v.deleted&&v.id!==excludeId&&norm(v.name)===key);
  }

  function vendorPage(){
    ensureVendorState();setHead('ผู้ให้บริการ / อู่ซ่อม','Maintenance Vendor Master');
    const manage=canManageVendor();
    content.innerHTML=`<div class="panel"><div class="toolbar"><div><h3>Vendor Registry</h3><div class="muted">ข้อมูลผู้ให้บริการ อู่ และศูนย์บริการสำหรับงานซ่อมบำรุง</div></div>${manage?'<button class="btn primary" id="newVendor">+ ผู้ให้บริการ</button>':''}</div><div class="toolbar"><input id="vendorQ" placeholder="ค้นหาชื่อ / รหัส / โทรศัพท์"><select id="vendorType"><option value="">ทุกประเภท</option><option value="external">อู่/ศูนย์ภายนอก</option><option value="internal">หน่วยซ่อมภายใน</option></select><select id="vendorState"><option value="active">ใช้งาน</option><option value="inactive">ระงับใช้งาน</option><option value="all">ทั้งหมด</option></select><button class="btn" id="vendorReset">ล้างตัวกรอง</button></div><div id="vendorRows"></div></div>`;
    const draw=()=>{
      const q=norm($('#vendorQ')?.value),type=$('#vendorType')?.value||'',state=$('#vendorState')?.value||'active';
      let rows=STATE.vendors.filter(v=>!v.deleted);
      if(type)rows=rows.filter(v=>v.type===type);
      if(state==='active')rows=rows.filter(v=>v.active!==false); else if(state==='inactive')rows=rows.filter(v=>v.active===false);
      if(q)rows=rows.filter(v=>norm(`${v.code} ${v.name} ${v.contactName} ${v.phone} ${v.address}`).includes(q));
      $('#vendorRows').innerHTML=rows.length?`<table><thead><tr><th>รหัส</th><th>ชื่อผู้ให้บริการ</th><th>ประเภท</th><th>ผู้ติดต่อ</th><th>โทรศัพท์</th><th>สถานะ</th>${manage?'<th>จัดการ</th>':''}</tr></thead><tbody>${rows.map(v=>`<tr class="vendor-row" data-vendor-id="${esc(v.id)}"><td>${esc(v.code||v.id)}</td><td><b>${esc(v.name)}</b><div class="muted">${esc(v.address||'')}</div></td><td>${esc(v.type==='internal'?'หน่วยซ่อมภายใน':'อู่/ศูนย์ภายนอก')}</td><td>${esc(v.contactName||'-')}</td><td>${esc(v.phone||'-')}</td><td>${pill(v.active===false?'inactive':'active')}</td>${manage?`<td><button class="btn sm" data-vendor-edit="${esc(v.id)}">แก้ไข</button>${canDeleteVendor()?` <button class="btn sm" data-vendor-delete="${esc(v.id)}">ลบ</button>`:''}</td>`:''}</tr>`).join('')}</tbody></table>`:'<div class="empty">ยังไม่มีข้อมูลผู้ให้บริการ</div>';
      $$('[data-vendor-id]').forEach(r=>r.onclick=e=>{if(e.target.closest('button'))return;vendorDetail(r.dataset.vendorId)});
      $$('[data-vendor-edit]').forEach(b=>b.onclick=e=>{e.stopPropagation();vendorForm(b.dataset.vendorEdit)});
      $$('[data-vendor-delete]').forEach(b=>b.onclick=e=>{e.stopPropagation();deleteVendor(b.dataset.vendorDelete)});
    };
    $('#vendorQ').oninput=draw;$('#vendorType').onchange=draw;$('#vendorState').onchange=draw;
    $('#vendorReset').onclick=()=>{$('#vendorQ').value='';$('#vendorType').value='';$('#vendorState').value='active';draw()};
    if($('#newVendor'))$('#newVendor').onclick=()=>vendorForm();draw();
  }

  function vendorDetail(id){
    ensureVendorState();const v=STATE.vendors.find(x=>x.id===id&&!x.deleted);if(!v)return vendorPage();
    setHead(v.name,'Vendor Detail');const manage=canManageVendor();
    content.innerHTML=`<div class="panel"><div class="toolbar"><button class="btn" id="vendorBack">← กลับทะเบียน</button><div>${manage?'<button class="btn primary" id="vendorEdit">แก้ไข</button>':''}</div></div><div class="detail-grid"><div><span class="muted">รหัส</span><b>${esc(v.code||v.id)}</b></div><div><span class="muted">ประเภท</span><b>${esc(v.type==='internal'?'หน่วยซ่อมภายใน':'อู่/ศูนย์ภายนอก')}</b></div><div><span class="muted">สถานะ</span><b>${esc(v.active===false?'ระงับใช้งาน':'ใช้งาน')}</b></div><div><span class="muted">ผู้ติดต่อ</span><b>${esc(v.contactName||'-')}</b></div><div><span class="muted">โทรศัพท์</span><b>${esc(v.phone||'-')}</b></div><div><span class="muted">แหล่งข้อมูล</span><b>${esc(v.source||'manual')}</b></div></div><div style="margin-top:16px"><span class="muted">ที่อยู่</span><p>${esc(v.address||'-')}</p><span class="muted">หมายเหตุ</span><p>${esc(v.note||'-')}</p></div></div>`;
    $('#vendorBack').onclick=vendorPage;if($('#vendorEdit'))$('#vendorEdit').onclick=()=>vendorForm(v.id);
  }

  function vendorForm(id=''){
    if(!canManageVendor())return toast('บทบาทนี้ไม่มีสิทธิ์แก้ไข Vendor Master',true);
    ensureVendorState();const old=id?STATE.vendors.find(x=>x.id===id&&!x.deleted):null;if(id&&!old)return toast('ไม่พบผู้ให้บริการ',true);
    formModal(old?'แก้ไขผู้ให้บริการ':'เพิ่มผู้ให้บริการ',`${fld('รหัส','code',old?.code||nextVendorCode(),true)}${fld('ชื่อผู้ให้บริการ / อู่','name',old?.name||'',true)}${sel('ประเภท','type',[['external','อู่/ศูนย์ภายนอก'],['internal','หน่วยซ่อมภายใน']],old?.type||'external')}${fld('ผู้ติดต่อ','contactName',old?.contactName||'')}${fld('โทรศัพท์','phone',old?.phone||'')}${area('ที่อยู่','address',old?.address||'')}${area('หมายเหตุ','note',old?.note||'')}${sel('สถานะ','active',[['true','ใช้งาน'],['false','ระงับใช้งาน']],String(old?.active!==false))}`,p=>{
      p.code=String(p.code||'').trim();p.name=String(p.name||'').trim();if(!p.code||!p.name)throw Error('กรุณากรอกรหัสและชื่อผู้ให้บริการ');
      if(STATE.vendors.some(v=>!v.deleted&&v.id!==id&&norm(v.code)===norm(p.code)))throw Error('รหัสผู้ให้บริการซ้ำ');
      if(vendorDuplicate(p.name,id))throw Error('ชื่อผู้ให้บริการซ้ำ');p.active=p.active==='true';
      if(old){const before=structuredClone(old);Object.assign(old,p,{updatedAt:now()});save(true,'แก้ไขผู้ให้บริการ','vendor',old.id,before,old)}
      else{const x={id:uid('VEN'),...p,source:'manual',deleted:false,createdAt:now(),updatedAt:now()};STATE.vendors.push(x);save(true,'เพิ่มผู้ให้บริการ','vendor',x.id,null,x)}
    });
  }

  function deleteVendor(id){
    if(!canDeleteVendor())return toast('เฉพาะ Admin เท่านั้นที่ลบ Vendor Master ได้',true);
    const v=STATE.vendors.find(x=>x.id===id&&!x.deleted);if(!v)return;
    if(!confirm(`ลบผู้ให้บริการ "${v.name}" ?\nข้อมูลจะถูก Soft Delete และยังคงอยู่ในประวัติ`))return;
    const before=structuredClone(v);v.deleted=true;v.active=false;v.deletedAt=now();v.updatedAt=v.deletedAt;save(true,'ลบผู้ให้บริการ','vendor',v.id,before,v);vendorPage();toast('ลบผู้ให้บริการแล้ว');
  }

  // Additive navigation/permission registration; locked Asset/Document entries are untouched.
  const settingGroup=NAV.find(x=>x[0]==='ตั้งค่า');
  if(settingGroup&&!settingGroup[1].some(x=>x[0]==='vendors'))settingGroup[1].push(['vendors','ผู้ให้บริการ / อู่ซ่อม']);
  if(typeof PARITY_MENU==='object'){
    ['admin','manager','fleetOfficer'].forEach(r=>{if(PARITY_MENU[r]&&!PARITY_MENU[r].includes('vendors'))PARITY_MENU[r].push('vendors')});
  }
  const oldRender=render;
  render=function(){if(view==='vendors'&&!assetDetailId)return vendorPage();return oldRender();};
  setTimeout(()=>{if(!STATE)return;ensureVendorState();save(false);if(typeof renderNav==='function')renderNav();if(typeof parityRefreshShell==='function')parityRefreshShell();},0);

  window.FLEET_VENDOR_TEST={ensureVendorState,vendorDuplicate,nextVendorCode,vendorDisplay,canManageVendor,canDeleteVendor};
})();
