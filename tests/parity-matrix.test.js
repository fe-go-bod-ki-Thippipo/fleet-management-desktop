const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');

const matrixPath='docs/FEATURE-PARITY-MATRIX-v0.13.4.md';
const readmePath='README.md';

test('v0.13.4 feature parity matrix exists',()=>{
  assert.equal(fs.existsSync(matrixPath),true,'missing Feature Parity Matrix');
});

test('parity matrix covers every locked functional block',()=>{
  const m=fs.readFileSync(matrixPath,'utf8');
  for(const id of ['A01','B01','C01','D01','E01','F01','G01','H01','I01','J01','K01','L01','M01','N01','O01','P01','Q01']){
    assert.ok(m.includes(`| ${id} |`),`missing parity block ${id}`);
  }
  for(const term of ['Permission','Data Scope','Owner Registry','Person','Calendar','Documents','Usage Workflow','Maintenance','Reports','Audit','Windows Installer EXE']){
    assert.ok(m.includes(term),`matrix missing ${term}`);
  }
});

test('v0.4.0 is explicitly marked parity recovery, not parity complete',()=>{
  const r=fs.readFileSync(readmePath,'utf8');
  assert.ok(r.includes('Parity Recovery'));
  assert.ok(r.includes('ยังไม่ใช่ Desktop Parity Baseline'));
});
