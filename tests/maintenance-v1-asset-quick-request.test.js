const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const vm=require('vm');

function load({tab='maintenance',allowed=true,apiReady=true,hasRequestPanel=true}={}){
  const calls=[];
  const requestHeading='<h3>คำขอแจ้งซ่อม</h3>';
  const requestPanelHtml=`<div class="panel" id="requestPanel">${requestHeading}<table id="requestTable"><tbody><tr><td>MR-001</td></tr></tbody></table></div>`;
  const historyPanelHtml='<div class="panel" id="existingHistory"><h3>ประวัติการซ่อม (Work Order)</h3></div>';
  const content={
    innerHTML:(hasRequestPanel?requestPanelHtml:'')+historyPanelHtml,
    elements:{},
    querySelectorAll(sel){return sel==='.panel'&&hasRequestPanel?[requestPanel]:[];},
    querySelector(sel){
      if(sel==='#assetQuickMaintenanceRequest')return this.innerHTML.includes('id="assetQuickMaintenanceRequest"')?{}:null;
      if(sel==='#assetQuickMaintenanceRequestBtn')return this.elements.assetQuickMaintenanceRequestBtn||null;
      return null;
    }
  };
  const heading={
    textContent:'คำขอแจ้งซ่อม',
    insertAdjacentHTML(pos,html){
      assert.equal(pos,'afterend');
      const headingIndex=content.innerHTML.indexOf(requestHeading);
      assert.ok(headingIndex>=0,'request heading must exist in realistic panel markup');
      content.innerHTML=content.innerHTML.replace(requestHeading,requestHeading+html);
      content.elements.assetQuickMaintenanceRequestBtn={id:'assetQuickMaintenanceRequestBtn'};
    }
  };
  const requestPanel={querySelector:sel=>sel==='h3'?heading:null};
  const requestApi=apiReady?{canCreate:()=>allowed,requestForm:(...args)=>calls.push(args)}:undefined;
  const ctx={window:null,console,content,assetTab:tab,$:sel=>content.querySelector(sel),FLEET_MAINTENANCE_REQUEST_TEST:requestApi,renderAssetTab:a=>{calls.push(['captured',a.id]);content.innerHTML+='<div id="captured">เดิม</div>';return 'original-result';}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/renderer/app/maintenance-v1-asset-quick-request.js','utf8'),ctx);
  return {ctx,calls,content,api:ctx.FLEET_MAINTENANCE_ASSET_QUICK_REQUEST_TEST};
}

test('quick request appears only on maintenance tab for allowed role',()=>{const x=load();const result=x.ctx.renderAssetTab({id:'A1'});assert.equal(result,'original-result');assert.match(x.content.innerHTML,/\+ แจ้งซ่อม/);assert.deepEqual(x.calls[0],['captured','A1']);for(const tab of ['documents','photos','usage','fuel','audit']){const y=load({tab});y.ctx.renderAssetTab({id:'A1'});assert.doesNotMatch(y.content.innerHTML,/\+ แจ้งซ่อม/)}});

test('quick request is inserted next to request panel heading and not at page top',()=>{const x=load();x.ctx.renderAssetTab({id:'A1'});const html=x.content.innerHTML;const headingPos=html.indexOf('<h3>คำขอแจ้งซ่อม</h3>');const buttonPos=html.indexOf('id="assetQuickMaintenanceRequest"');const tablePos=html.indexOf('<table id="requestTable">');assert.ok(headingPos>=0);assert.ok(buttonPos>headingPos,'button must follow request panel heading');assert.ok(buttonPos<tablePos,'button must remain inside request panel before its table');assert.ok(!html.startsWith('<span class="toolbar" id="assetQuickMaintenanceRequest"'),'button must not be inserted at top of content')});

test('missing request panel hides button with no page-top fallback',()=>{const x=load({hasRequestPanel:false});const before=x.content.innerHTML;assert.doesNotThrow(()=>x.ctx.renderAssetTab({id:'A1'}));assert.doesNotMatch(x.content.innerHTML,/\+ แจ้งซ่อม/);assert.ok(x.content.innerHTML.startsWith(before),'existing content must remain first when request panel is absent')});

test('quick request hidden when canCreate is false',()=>{const x=load({allowed:false});x.ctx.renderAssetTab({id:'A1'});assert.doesNotMatch(x.content.innerHTML,/\+ แจ้งซ่อม/)});

test('click calls requestForm with current asset id prefill',()=>{const x=load();x.ctx.renderAssetTab({id:'A9'});x.content.elements.assetQuickMaintenanceRequestBtn.onclick();assert.equal(JSON.stringify(x.calls.at(-1)),JSON.stringify(['',{assetId:'A9'}]))});

test('captured renderer content including request and repair history remains intact',()=>{const x=load();x.ctx.renderAssetTab({id:'A1'});assert.match(x.content.innerHTML,/คำขอแจ้งซ่อม/);assert.match(x.content.innerHTML,/ประวัติการซ่อม \(Work Order\)/);assert.match(x.content.innerHTML,/id="captured"/)});

test('missing request API hides button and never throws',()=>{const x=load({apiReady:false});assert.doesNotThrow(()=>x.ctx.renderAssetTab({id:'A1'}));assert.doesNotMatch(x.content.innerHTML,/\+ แจ้งซ่อม/)});
