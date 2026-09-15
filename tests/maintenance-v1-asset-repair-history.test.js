const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load({tab='maintenance',api=true}={}){
  const calls={original:0,total:[],downtime:[],detail:[]};
  const rows=[];
  const box={innerHTML:'',insertAdjacentHTML(_,html){this.innerHTML+=html;rows.length=0;for(const m of html.matchAll(/data-asset-wo-row="([^"]+)"/g))rows.push({dataset:{assetWoRow:m[1]},onclick:null});},querySelectorAll(sel){return sel==='[data-asset-wo-row]'?rows:[];}};
  const STATE={workOrders:[]};
  const ctx={STATE,assetTab:tab,window:null,console,esc:v=>String(v??''),$:sel=>sel==='#assetTab'?box:null};
  ctx.renderAssetTab=()=>{calls.original++;box.innerHTML+='<div class="panel"><h3>คำขอแจ้งซ่อม</h3><span>REQUEST-PANEL</span></div>';};
  if(api)ctx.FLEET_MAINTENANCE_WORKORDER_API={totalCostFor:id=>{calls.total.push(id);return id==='W2'?2500.5:1200;},downtimeFor:id=>{calls.downtime.push(id);return id==='W2'?2.5:1;},workOrderDetail:id=>calls.detail.push(id)};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-asset-repair-history.js','utf8'),ctx);
  return {ctx,STATE,box,rows,calls,render:a=>ctx.renderAssetTab(a),api:ctx.FLEET_MAINTENANCE_ASSET_REPAIR_HISTORY_TEST};
}
function wo(id,status='closed',over={}){return {id,workOrderNo:`WO-${id}`,assetId:'A1',status,closedAt:'2026-09-10T10:00:00Z',maintenanceType:'repair',...over};}

test('closed WorkOrders render with API total cost, downtime, newest first and clickable rows',()=>{const x=load();x.STATE.workOrders.push(wo('W1','closed',{closedAt:'2026-09-01T10:00:00Z'}),wo('W2','closed',{closedAt:'2026-09-12T10:00:00Z',maintenanceType:'service'}));x.render({id:'A1'});assert.match(x.box.innerHTML,/ประวัติการซ่อม \(Work Order\)/);assert.match(x.box.innerHTML,/฿2,500.50/);assert.match(x.box.innerHTML,/2.5 วัน/);assert.ok(x.box.innerHTML.indexOf('WO-W2')<x.box.innerHTML.indexOf('WO-W1'));assert.deepEqual(x.calls.total,['W2','W1']);assert.deepEqual(x.calls.downtime,['W2','W1']);x.rows[0].onclick();assert.deepEqual(x.calls.detail,['W2']);});

test('non-closed WorkOrders are excluded from Asset repair history',()=>{const x=load();for(const status of ['open','dispatched','in_progress','pending_inspection','cancelled'])x.STATE.workOrders.push(wo(`X-${status}`,status));x.STATE.workOrders.push(wo('CLOSED'));x.render({id:'A1'});assert.match(x.box.innerHTML,/WO-CLOSED/);for(const status of ['open','dispatched','in_progress','pending_inspection','cancelled'])assert.doesNotMatch(x.box.innerHTML,new RegExp(`WO-X-${status}`));});

test('no closed WorkOrder means no repair history panel',()=>{const x=load();x.STATE.workOrders.push(wo('W1','open'));x.render({id:'A1'});assert.doesNotMatch(x.box.innerHTML,/ประวัติการซ่อม \(Work Order\)/);assert.equal(x.calls.original,1);});

test('wrapper preserves existing request panel and does not affect non-maintenance tabs',()=>{const x=load({tab:'documents'});x.STATE.workOrders.push(wo('W1'));x.render({id:'A1'});assert.equal(x.calls.original,1);assert.match(x.box.innerHTML,/REQUEST-PANEL/);assert.doesNotMatch(x.box.innerHTML,/ประวัติการซ่อม \(Work Order\)/);x.ctx.assetTab='maintenance';x.render({id:'A1'});assert.equal(x.calls.original,2);assert.match(x.box.innerHTML,/REQUEST-PANEL/);assert.match(x.box.innerHTML,/ประวัติการซ่อม \(Work Order\)/);});

test('undefined WorkOrder API is defensive: original wrapper still runs and no error/panel',()=>{const x=load({api:false});x.STATE.workOrders.push(wo('W1'));assert.doesNotThrow(()=>x.render({id:'A1'}));assert.equal(x.calls.original,1);assert.match(x.box.innerHTML,/REQUEST-PANEL/);assert.doesNotMatch(x.box.innerHTML,/ประวัติการซ่อม \(Work Order\)/);});

test('history is scoped to current asset and downtime null renders dash',()=>{const x=load();x.ctx.FLEET_MAINTENANCE_WORKORDER_API.downtimeFor=id=>{x.calls.downtime.push(id);return null;};x.STATE.workOrders.push(wo('A1WO'),wo('A2WO','closed',{assetId:'A2'}));x.render({id:'A1'});assert.match(x.box.innerHTML,/WO-A1WO/);assert.doesNotMatch(x.box.innerHTML,/WO-A2WO/);assert.match(x.box.innerHTML,/<td>-<\/td>/);});
