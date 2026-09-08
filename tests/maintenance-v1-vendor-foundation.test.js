const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load(role='admin'){
  const STATE={vendors:[{id:'V1',code:'VEN-001',name:'อู่ เอ',type:'external'},{id:'V2',code:'VEN-002',name:'อู่ลบแล้ว',type:'external',deleted:true}]};
  const NAV=[['ตั้งค่า',[['masters','ตั้งค่าข้อมูลทรัพย์สิน']]]];
  const PARITY_MENU={admin:[],manager:[],fleetOfficer:[],viewer:[]};
  const ctx={STATE,NAV,PARITY_MENU,CURRENT_ROLE:role,window:null,console,structuredClone:global.structuredClone,
    render:()=>{},view:'dashboard',assetDetailId:'',migrateState:()=>{},setTimeout:fn=>{fn();return 0},save:()=>{},renderNav:()=>{},parityRefreshShell:()=>{},
    setHead:()=>{},content:{innerHTML:''},toast:()=>{},confirm:()=>true,now:()=> '2026-09-08T00:00:00.000Z',uid:p=>`${p}-TEST`,esc:v=>String(v??''),pill:v=>String(v),
    $:()=>({value:'',innerHTML:'',oninput:null,onchange:null,onclick:null}),$$:()=>[],fld:()=>'',sel:()=>'',area:()=>'',formModal:()=>{}};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-vendor-foundation.js','utf8'),ctx);
  return {ctx,STATE,NAV,PARITY_MENU,api:ctx.FLEET_VENDOR_TEST};
}

test('vendor foundation initializes additive state without touching existing vendor data',()=>{
  const {STATE,api}=load();api.ensureVendorState();
  assert.equal(STATE.vendors.length,2);
  assert.equal(STATE.vendors[0].active,true);
  assert.equal(STATE.vendors[0].deleted,false);
  assert.equal(STATE.vendors[0].source,'manual');
  assert.equal(STATE.vendors[1].deleted,true);
});

test('vendor duplicate detection normalizes name and ignores soft-deleted rows',()=>{
  const {api}=load();
  assert.equal(api.vendorDuplicate('  อู่ เอ  '),true);
  assert.equal(api.vendorDuplicate('อู่ลบแล้ว'),false);
  assert.equal(api.vendorDuplicate('อู่ เอ','V1'),false);
});

test('vendor code generator skips existing codes',()=>{
  const {api}=load();assert.equal(api.nextVendorCode(),'VEN-003');
});

test('vendor permissions follow locked role intent',()=>{
  assert.equal(load('admin').api.canManageVendor(),true);assert.equal(load('admin').api.canDeleteVendor(),true);
  assert.equal(load('manager').api.canManageVendor(),true);assert.equal(load('manager').api.canDeleteVendor(),false);
  assert.equal(load('fleetOfficer').api.canManageVendor(),true);assert.equal(load('fleetOfficer').api.canDeleteVendor(),false);
  assert.equal(load('viewer').api.canManageVendor(),false);assert.equal(load('viewer').api.canDeleteVendor(),false);
});

test('vendor page is registered additively and only authorized roles receive menu access',()=>{
  const {NAV,PARITY_MENU}=load();
  assert.ok(NAV.find(x=>x[0]==='ตั้งค่า')[1].some(x=>x[0]==='vendors'));
  for(const role of ['admin','manager','fleetOfficer'])assert.ok(PARITY_MENU[role].includes('vendors'));
  assert.ok(!PARITY_MENU.viewer.includes('vendors'));
});

test('vendor implementation uses audit-preserving soft delete and does not modify locked asset/document core',()=>{
  const src=fs.readFileSync('src/renderer/app/maintenance-v1-vendor-foundation.js','utf8');
  assert.match(src,/v\.deleted=true/);assert.match(src,/save\(true,'ลบผู้ให้บริการ','vendor'/);assert.match(src,/เฉพาะ Admin เท่านั้นที่ลบ Vendor Master ได้/);
  assert.doesNotMatch(src,/assetProfile\s*=|documentPage\s*=|renderDocTable\s*=|assetForm/);
  const index=fs.readFileSync('index.html','utf8');assert.match(index,/maintenance-v1-vendor-foundation\.js/);
});
