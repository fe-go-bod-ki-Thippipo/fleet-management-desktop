const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
test('core and parity migrations exist',()=>{for(const f of ['001_foundation.sql','002_usage_maintenance_fuel_cost.sql','003_hr_integration.sql','005_v030_parity.sql'])assert.equal(fs.existsSync(path.join(root,'database/migrations',f)),true)});
test('package version is 0.3.0',()=>assert.equal(require('../package.json').version,'0.3.0'));
test('desktop parity files exist',()=>{for(const f of ['src/services/database.js','src/renderer/app.js','src/main/main.js','src/preload/preload.js','.github/workflows/build-windows.yml'])assert.equal(fs.existsSync(path.join(root,f)),true,`missing ${f}`);const pkg=require('../package.json');assert.ok(pkg.scripts['build:win']);assert.ok(pkg.build.win);assert.ok(pkg.build.nsis);assert.ok(pkg.build.portable)});
