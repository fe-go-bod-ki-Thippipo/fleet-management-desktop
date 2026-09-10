const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function loadRequest(){
  const STATE={maintenanceRequests:[],workOrders:[],audit:[],vendors:[],assets:[{id:'RAW-ID-ONLY',code:'',plate:'',mileage:1000,meterUnit:'km',deleted:false}],people:[],userAccounts:[],maintenance:[],pmPlans:[]};
  const ctx={STATE,CURRENT_ROLE:'admin',window:null,console,structuredClone,FormData:global.FormData,FileReader:function(){},uid:p=>`${p}-1`,now:()=> '2026-09-10T04:00:00.000Z',today:()=> '2026-09-10',pAudit:()=>{},esc:v=>String(v??''),money:n=>String(n),pill:s=>s,kv:(a,b)=>`${a}:${b}`,content:{innerHTML:''},dialog:{querySelector:()=>null},$:()=>null,$$:()=>[],setHead:()=>{},toast:()=>{},formModal:()=>{},confirm:()=>true};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-request.js','utf8'),ctx);return {ctx,api:ctx.FLEET_MAINTENANCE_REQUEST_TEST};
}

test('assetLabelFor uses plate then code then safe fallback without raw asset ID',()=>{const {api}=loadRequest();assert.equal(api.assetLabelFor({id:'A1',code:'FL-020',plate:'กล 4270'}),'กล 4270');assert.equal(api.assetLabelFor({id:'A2',code:'FL-021',plate:''}),'FL-021');const label=api.assetLabelFor({id:'SECRET-RAW-ID',code:'',plate:''});assert.equal(label,'(ไม่มีทะเบียน)');assert.doesNotMatch(label,/SECRET-RAW-ID/)});

test('meter warning applies and removes warning class dynamically',()=>{const {api}=loadRequest();const active=new Set(),warn={textContent:'',classList:{toggle:(c,on)=>on?active.add(c):active.delete(c)}};const asset={mileage:1000};api.applyMeterWarning(warn,asset,'900');assert.match(warn.textContent,/คำเตือน/);assert.equal(active.has('warn-box'),true);api.applyMeterWarning(warn,asset,'1100');assert.equal(warn.textContent,'');assert.equal(active.has('warn-box'),false)});

function loadAssetIntegration({requests=[]}={}){
  const box={innerHTML:'',insertAdjacentHTML:(_where,html)=>{box.innerHTML+=html}};
  const rows=[];const calls=[];
  const STATE={maintenanceRequests:requests};
  const requestApi={workOrderBadge:r=>`<badge>${r.id==='R2'?'มีแล้ว':'ยังไม่มี'}</badge>`,requestDetail:id=>calls.push(`detail:${id}`)};
  const original=function originalRenderAssetTab(a){calls.push(`original:${a.id}`);box.innerHTML=`<div class="legacy">LEGACY-${a.id}</div>`;};
  const ctx={window:null,console,STATE,assetTab:'documents',renderAssetTab:original,esc:v=>String(v??''),pill:s=>`<pill>${s}</pill>`,$:q=>q==='#assetTab'?box:null,$$:q=>{if(q==='[data-asset-mr-row]')return rows;return []},FLEET_MAINTENANCE_REQUEST_TEST:requestApi};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-asset-integration.js','utf8'),ctx);
  return {ctx,box,calls,rows,api:ctx.FLEET_MAINTENANCE_ASSET_INTEGRATION_TEST,original};
}

test('renderAssetTab wrapper leaves non-maintenance tabs exactly to original renderer',()=>{const x=loadAssetIntegration({requests:[{id:'R1',assetId:'A1',requestNo:'MR-1'}]});x.ctx.assetTab='documents';x.ctx.renderAssetTab({id:'A1'});assert.deepEqual(x.calls,['original:A1']);assert.equal(x.box.innerHTML,'<div class="legacy">LEGACY-A1</div>');assert.doesNotMatch(x.box.innerHTML,/คำขอแจ้งซ่อม/);assert.equal(x.api.originalRenderAssetTab,x.original)});

test('maintenance tab keeps legacy content then appends every MaintenanceRequest status',()=>{const statuses=['draft','document_printed','approved','rejected','cancelled'];const requests=statuses.map((status,i)=>({id:`R${i+1}`,assetId:'A1',requestNo:`MR-000${i+1}`,requestDate:'2026-09-10',issue:`issue-${status}`,urgency:'high',status}));requests.push({id:'OTHER',assetId:'A2',requestNo:'MR-9999',status:'draft'});const x=loadAssetIntegration({requests});x.ctx.assetTab='maintenance';x.ctx.renderAssetTab({id:'A1'});assert.match(x.box.innerHTML,/LEGACY-A1/);assert.match(x.box.innerHTML,/คำขอแจ้งซ่อม/);for(const status of statuses)assert.match(x.box.innerHTML,new RegExp(`issue-${status}`));assert.doesNotMatch(x.box.innerHTML,/MR-9999/);assert.match(x.box.innerHTML,/มี Work Order แล้วหรือไม่/)});

test('maintenance tab shows empty message when asset has no MaintenanceRequest',()=>{const x=loadAssetIntegration({requests:[{id:'R1',assetId:'A2',requestNo:'MR-1'}]});x.ctx.assetTab='maintenance';assert.doesNotThrow(()=>x.ctx.renderAssetTab({id:'A1'}));assert.match(x.box.innerHTML,/LEGACY-A1/);assert.match(x.box.innerHTML,/ยังไม่มีคำขอแจ้งซ่อม/);assert.doesNotMatch(x.box.innerHTML,/<table>/)});
