const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(){
  const STATE={
    vendors:[
      {id:'V1',name:'อู่ เอ',type:'external',active:true,deleted:false},
      {id:'V2',name:'อู่พักใช้',type:'external',active:false,deleted:false},
      {id:'V3',name:'อู่ลบแล้ว',type:'external',active:true,deleted:true},
      {id:'V4',name:'หน่วยซ่อมกลาง',type:'internal',active:true,deleted:false}
    ],
    assets:[{id:'A1',plate:'กข 1234',deleted:false,status:'available'}],
    maintenance:[{id:'OLD1',no:'WO-0001',assetId:'A1',vendor:'อู่เก่าแบบข้อความ',cost:500,status:'closed'}],
    expenses:[]
  };
  const calls={form:null,save:[]};let uidNo=1;
  const sel=(label,name,opts,value='')=>`<label>${label}<select name="${name}">${opts.map(o=>`<option value="${o[0]}"${String(o[0])===String(value)?' selected':''}>${o[1]}</option>`).join('')}</select></label>`;
  const legacy=function legacyMaintenanceForm(){return 'legacy';};
  const ctx={STATE,window:null,console,maintenanceForm:legacy,uid:p=>`${p}-T${uidNo++}`,now:()=> '2026-09-09T00:00:00.000Z',today:()=> '2026-09-09',save:(...a)=>calls.save.push(a),sel,selObj:(l,n)=>`<select name="${n}"></select>`,area:(l,n)=>`<textarea name="${n}"></textarea>`,fld:(l,n)=>`<input name="${n}">`,formModal:(title,html,onSave)=>{calls.form={title,html,onSave};return calls.form;}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-legacy-vendor-patch.js','utf8'),ctx);
  return {ctx,STATE,calls,api:ctx.FLEET_MAINTENANCE_VENDOR_PATCH_TEST,legacy};
}

test('dropdown includes only active non-deleted Vendor Master rows',()=>{const {api}=load();const html=api.vendorSelectHtml();assert.match(html,/V1/);assert.match(html,/อู่ เอ/);assert.match(html,/V4/);assert.match(html,/หน่วยซ่อมกลาง/);assert.doesNotMatch(html,/V2/);assert.doesNotMatch(html,/อู่พักใช้/);assert.doesNotMatch(html,/V3/);assert.doesNotMatch(html,/อู่ลบแล้ว/)});

test('maintenanceForm is reassigned additively and renders vendorId dropdown instead of free-text vendor',()=>{const {ctx,calls,legacy,api}=load();assert.equal(api.capturedLegacyMaintenanceForm,legacy);assert.notEqual(ctx.maintenanceForm,legacy);ctx.maintenanceForm();assert.match(calls.form.html,/name="vendorId"/);assert.doesNotMatch(calls.form.html,/name="vendor"/)});

test('saving a new legacy Work Order stores vendorId and vendorNameSnapshot together',()=>{const {api,STATE}=load();const x=api.saveLegacyMaintenanceWithVendor({assetId:'A1',maintenanceType:'repair',issue:'เปลี่ยนลูกปืน',meterValue:'1000',vendorId:'V1',cost:'1250.50',status:'repairing'});assert.equal(x.vendorId,'V1');assert.equal(x.vendorNameSnapshot,'อู่ เอ');assert.equal(x.vendor,'อู่ เอ');assert.equal(x.cost,1250.5);assert.equal(STATE.assets[0].status,'repair');assert.equal(STATE.expenses.at(-1).sourceId,x.id)});

test('inactive or deleted vendor IDs are rejected even if submitted outside the dropdown',()=>{for(const id of ['V2','V3']){const {api}=load();assert.throws(()=>api.saveLegacyMaintenanceWithVendor({assetId:'A1',vendorId:id,cost:'0',status:'new'}),/ไม่พร้อมใช้งาน/)}});

test('legacy free-text vendor data remains untouched and readable',()=>{const {api,STATE}=load();const before=structuredClone(STATE.maintenance[0]);assert.equal(api.legacyVendorDisplay(STATE.maintenance[0]),'อู่เก่าแบบข้อความ');assert.deepEqual(STATE.maintenance[0],before)});

test('historical snapshot is preferred over renamed Vendor Master value',()=>{const {api,STATE}=load();const x=api.saveLegacyMaintenanceWithVendor({assetId:'A1',vendorId:'V1',cost:'0',status:'closed'});STATE.vendors[0].name='อู่ชื่อใหม่';assert.equal(api.legacyVendorDisplay(x),'อู่ เอ')});

test('Batch 2 patch does not modify locked Asset or Document functions',()=>{const src=fs.readFileSync('src/renderer/app/maintenance-v1-legacy-vendor-patch.js','utf8');assert.doesNotMatch(src,/assetProfile\s*=|assetForm\s*=|documentPage\s*=|assetDocumentDetail\s*=|renderDocTable\s*=/);const index=fs.readFileSync('index.html','utf8');assert.match(index,/maintenance-v1-vendor-foundation\.js[\s\S]*maintenance-v1-legacy-vendor-patch\.js[\s\S]*document-core-v048\.js/)});
