const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const required=[
  'package.json','index.html','src/main/main.js','src/preload/preload.js','src/renderer/app.js','src/renderer/styles.css',
  'src/services/database.js','database/migrations/001_foundation.sql','database/migrations/002_usage_maintenance_fuel_cost.sql',
  'database/migrations/003_hr_integration.sql','build/icon.ico','scripts/build-windows.bat','.github/workflows/build-windows.yml'
];
let bad=0;
for(const f of required){
  if(!fs.existsSync(path.join(root,f))){console.error('MISSING',f);bad++}
  else console.log('OK',f)
}
const pkg=require(path.join(root,'package.json'));
if(pkg.version!=='0.1.2'){console.error('VERSION mismatch',pkg.version);bad++}
if(!pkg.scripts['build:win']){console.error('MISSING build:win script');bad++}
process.exitCode=bad?1:0;
