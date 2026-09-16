const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load({tab='maintenance',allowed=true,apiReady=true}={}){
  const calls=[];
  const content={innerHTML:'<div id="existingRequest">คำขอแจ้งซ่อม</div><div id="existingHistory">ประวัติการซ่อม (Work Order)</div>',elements:{},insertAdjacentHTML(pos,html){assert.equal(pos,'afterbegin');this.innerHTML=html+this.innerHTML;this.elements.assetQuickMaintenanceRequestBtn={id:'assetQuickMaintenanceRequestBtn'};},querySelector(sel){if(sel==='#assetQuickMaintenanceRequest')return this.innerHTML.includes('id="assetQuickMaintenanceRequest"')?{}:null;if(sel==='#assetQuickMaintenanceRequestBtn')return this.elements.assetQuickMaintenanceRequestBtn||null;return null;}};
  const requestApi=apiReady?{canCreate:()=>allowed,requestForm:(...args)=>calls.push(args)}:undefined;
  const ctx={window:null,console,content,assetTab:tab,$:sel=>content.querySelector(sel),FLEET_MAINTENANCE_REQUEST_TEST:requestApi,renderAssetTab:a=>{calls.push(['captured',a.id]);content.innerHTML+='<div id="captured">เดิม</div>';return 'original-result';}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-asset-quick-request.js','utf8'),ctx);
  return {ctx,calls,content,api:ctx.FLEET_MAINTENANCE_ASSET_QUICK_REQUEST_TEST};
}

test('quick request appears only on maintenance tab for allowed role',()=>{const x=load();const result=x.ctx.renderAssetTab({id:'A1'});assert.equal(result,'original-result');assert.match(x.content.innerHTML,/\+ แจ้งซ่อม/);assert.deepEqual(x.calls[0],['captured','A1']);for(const tab of ['documents','photos','usage','fuel','audit']){const y=load({tab});const before=y.content.innerHTML;y.ctx.renderAssetTab({id:'A1'});assert.doesNotMatch(y.content.innerHTML,/\+ แจ้งซ่อม/);assert.ok(y.content.innerHTML.startsWith(before))}});

test('quick request hidden when canCreate is false',()=>{const x=load({allowed:false});x.ctx.renderAssetTab({id:'A1'});assert.doesNotMatch(x.content.innerHTML,/\+ แจ้งซ่อม/)});

test('click calls requestForm with current asset id prefill',()=>{const x=load();x.ctx.renderAssetTab({id:'A9'});x.content.elements.assetQuickMaintenanceRequestBtn.onclick();assert.equal(JSON.stringify(x.calls.at(-1)),JSON.stringify(['',{assetId:'A9'}]))});

test('captured renderer content including request and repair history remains intact',()=>{const x=load();x.ctx.renderAssetTab({id:'A1'});assert.match(x.content.innerHTML,/คำขอแจ้งซ่อม/);assert.match(x.content.innerHTML,/ประวัติการซ่อม \(Work Order\)/);assert.match(x.content.innerHTML,/id="captured"/)});

test('missing request API hides button and never throws',()=>{const x=load({apiReady:false});assert.doesNotThrow(()=>x.ctx.renderAssetTab({id:'A1'}));assert.doesNotMatch(x.content.innerHTML,/\+ แจ้งซ่อม/)});
