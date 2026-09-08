const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');

function load({seedChain=true}={}){
  const documents=seedChain?[{id:'D1',assetId:'A1',type:'act',version:1,status:'superseded',supersededById:'D2',attachment:{name:'v1.pdf',type:'application/pdf',data:'data:application/pdf;base64,V1'}},{id:'D2',assetId:'A1',type:'act',version:2,status:'superseded',previousVersionId:'D1',supersededById:'D3',attachment:{name:'v2.pdf',type:'application/pdf',data:'data:application/pdf;base64,V2'}},{id:'D3',assetId:'A1',type:'act',version:3,status:'active',previousVersionId:'D2',expiryDate:'2026-09-10',attachment:{name:'v3.pdf',type:'application/pdf',data:'data:application/pdf;base64,V3'}},{id:'LEG1',assetId:'A1',type:'act',version:1,status:'active'}]:[];
  const STATE={documents,masters:{documentTypes:[{id:'T1',key:'tax',name:'ภาษีรถ'},{id:'T2',key:'act',name:'พ.ร.บ.'},{id:'T3',key:'insurance',name:'ประกันภัย'},{id:'T4',key:'inspect',name:'ตรวจสภาพ'},{id:'T5',key:'other',name:'เอกสารอื่น'}],insuranceCompanies:[],vehicleTypes:[],machineryTypes:[],brands:[],models:[],colors:[],bodyTypes:[],fuelTypes:[]},assets:[{id:'A1',plate:'กก 1000',code:'FL-001',deleted:false}],companies:[],ownerRegistry:[],departments:[],locations:[],operatingUnits:[],people:[],usage:[],maintenance:[],pmPlans:[],fuel:[],expenses:[],audit:[]};
  let seq=0;
  const ctx={STATE,console,PARITY_ROLES:{},CURRENT_ROLE:'viewer',assetDetailId:'A1',assetTab:'general',esc:v=>String(v??''),today:()=> '2026-09-03',now:()=> '2026-09-03T00:00:00.000Z',uid:p=>`${p}-TEST-${++seq}`,pActive:x=>x,pRequire:()=>true,pCan:()=>false,pAudit:()=>{},save:()=>{},toast:()=>{},money:n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2}),pill:s=>String(s),setHead:()=>{},closeModal:()=>{},confirm:()=>true,setTimeout:()=>0,clearTimeout:()=>{},document:{querySelector:()=>null,createElement:()=>({}),body:{appendChild:()=>{}}},modal:{classList:{remove:()=>{}}},dialog:{querySelector:()=>({files:[]}),querySelectorAll:()=>[],classList:{add:()=>{}}},content:{innerHTML:''},FormData:function(){},FileReader:function(){},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},structuredClone:global.structuredClone};
  ctx.window=ctx;
  ctx.$=()=>({value:'',innerHTML:'',textContent:'',disabled:false,querySelectorAll:()=>[],addEventListener:()=>{}});
  ctx.$$=()=>[];
  ctx.formModal=(title,html,onSave)=>{ctx.__form={title,html,onSave}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/part2.js','utf8'),ctx);
  vm.runInContext(fs.readFileSync('src/renderer/app/document-core-v048.js','utf8'),ctx);
  ctx.assetProfile=()=>{};
  return {ctx,api:ctx.FLEET_DOCUMENT_CORE_TEST,STATE};
}

test('document chain follows IDs not duplicate version numbers',()=>{const {api,STATE}=load();assert.equal(api.chainFrom(STATE.documents[1]).map(x=>x.id).join(','),'D1,D2,D3');assert.equal(api.linked(STATE.documents[3]),false);assert.equal(api.isCurrent(STATE.documents[2]),true);assert.equal(api.isCurrent(STATE.documents[1]),false)});

test('selected historical version keeps its own attachment',()=>{const {api,STATE}=load();assert.equal(api.attachmentOf(STATE.documents[0]).name,'v1.pdf');assert.equal(api.attachmentOf(STATE.documents[1]).name,'v2.pdf');assert.equal(api.attachmentOf(STATE.documents[2]).name,'v3.pdf')});

test('expiry days are calculated and readable',()=>{const {api,STATE}=load();assert.equal(api.expiryDays(STATE.documents[2]),7);assert.equal(api.expiryText(STATE.documents[2]),'เหลือ 7 วัน')});

test('inspection specific form includes decimal expense field',()=>{const {api}=load({seedChain:false});const html=api.specific('inspect',{});assert.match(html,/name="expenseAmount"/);assert.match(html,/name="expenseAmount"[^>]*step="0\.01"/)});

test('all document money inputs use decimal step while unrelated numeric inputs do not',()=>{const {api}=load({seedChain:false});for(const [type,fields] of [['tax',['taxAmount']],['act',['premium']],['insurance',['premium','insuredAmount']],['inspect',['expenseAmount']],['other',['expenseAmount']]]){const html=api.specific(type,{});for(const name of fields)assert.match(html,new RegExp(`name="${name}"[^>]*step="0\\.01"`),`${type}.${name} must allow decimals`)}const part2=fs.readFileSync('src/renderer/app/part2.js','utf8');assert.match(part2,/MONEY_FIELDS\.has\(n\)/);assert.doesNotMatch(part2,/name="seats"[^>]*step="0\.01"/)});

test('document submit preserves 1250.75 for every document type and edit reload keeps the exact value',async()=>{
  const cases=[['tax',{taxAmount:'1250.75'},['taxAmount']],['act',{premium:'1250.75'},['premium']],['insurance',{premium:'1250.75',insuredAmount:'1250.75'},['premium','insuredAmount']],['inspect',{expenseAmount:'1250.75'},['expenseAmount']],['other',{expenseAmount:'1250.75'},['expenseAmount']]];
  for(const [type,moneyPayload,fields] of cases){
    const {ctx,STATE}=load({seedChain:false});ctx.documentForm({type},'A1');assert.ok(ctx.__form?.onSave,`${type} form should open`);await ctx.__form.onSave({assetId:'A1',type,docNo:`DOC-${type}`,issueDate:'2026-09-03',expiryDate:'2027-09-03',...moneyPayload});assert.equal(STATE.documents.length,1,`${type} should save one document`);const saved=STATE.documents[0];for(const field of fields)assert.equal(saved[field],1250.75,`${type}.${field} must preserve decimal value`);ctx.documentForm(saved,'A1');for(const field of fields)assert.match(ctx.__form.html,new RegExp(`name="${field}"[^>]*value="1250\\.75"`),`${type}.${field} edit form must reload exact decimal`);
  }
});

test('expenseOf, registry rendering and CSV export preserve decimal document expense values',()=>{
  const {ctx,api,STATE}=load({seedChain:false});const docs=[{id:'TAX',assetId:'A1',type:'tax',taxAmount:100,version:1,status:'active'},{id:'ACT',assetId:'A1',type:'act',premium:100.5,version:1,status:'active'},{id:'INS',assetId:'A1',type:'insurance',premium:1250.75,insuredAmount:5000.25,version:1,status:'active'},{id:'CHK',assetId:'A1',type:'inspect',expenseAmount:1250.75,version:1,status:'active'},{id:'OTH',assetId:'A1',type:'other',expenseAmount:100.5,version:1,status:'active'}];STATE.documents.push(...docs);assert.deepEqual(docs.map(api.expenseOf),[100,100.5,1250.75,1250.75,100.5]);const box={innerHTML:'',querySelectorAll:()=>[]};ctx.renderDocTable(box,docs);assert.match(box.innerHTML,/>100</);assert.match(box.innerHTML,/>100\.5</);assert.match(box.innerHTML,/>1,250\.75</);const csv=api.buildCsv(docs);for(const value of ['"100"','"100.5"','"1250.75"'])assert.ok(csv.includes(value),`CSV must include ${value}`)
});

test('normalizeMoneyFields uses Number conversion without truncating or rounding',()=>{const {api}=load({seedChain:false});for(const value of ['100','100.50','1250.75']){const p={taxAmount:value,premium:value,insuredAmount:value,expenseAmount:value};api.normalizeMoneyFields(p);for(const k of Object.keys(p))assert.equal(p[k],Number(value))}});

test('authoritative core still contains duplicate prevention, locked renewal and admin soft delete',()=>{const s=fs.readFileSync('src/renderer/app/document-core-v048.js','utf8');for(const x of ['มีเอกสารประเภทนี้อยู่แล้ว','_sourceDocumentId','disabled','Source Document ID','เฉพาะ Admin เท่านั้นที่ลบเอกสารได้','deleted=true','pAudit(\'ลบเอกสาร\''])assert.ok(s.includes(x),`missing ${x}`)});
