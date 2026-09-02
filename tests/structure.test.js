const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');

test('core migrations exist',()=>{
  for(const f of ['001_foundation.sql','002_usage_maintenance_fuel_cost.sql','003_hr_integration.sql'])
    assert.equal(fs.existsSync(path.join(root,'database/migrations',f)),true);
});

test('package version is 0.1.2',()=>assert.equal(require('../package.json').version,'0.1.2'));

test('Windows build foundation exists',()=>{
  for(const f of ['build/icon.ico','scripts/build-windows.bat','.github/workflows/build-windows.yml'])
    assert.equal(fs.existsSync(path.join(root,f)),true,`missing ${f}`);
  const pkg=require('../package.json');
  assert.ok(pkg.scripts['build:win']);
  assert.ok(pkg.build.win);
  assert.ok(pkg.build.nsis);
});
