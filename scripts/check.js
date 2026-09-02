const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const required=['package.json','index.html','src/main/main.js','src/preload/preload.js','src/renderer/app.js','src/renderer/styles.css','src/services/database.js','database/migrations/001_foundation.sql','database/migrations/002_usage_maintenance_fuel_cost.sql','database/migrations/003_hr_integration.sql','database/migrations/005_v030_parity.sql','scripts/build-windows.bat','.github/workflows/build-windows.yml'];
let bad=0;for(const f of required){if(!fs.existsSync(path.join(root,f))){console.error('MISSING',f);bad++}else console.log('OK',f)}
const pkg=require(path.join(root,'package.json'));if(pkg.version!=='0.3.0'){console.error('VERSION mismatch',pkg.version);bad++}if(!pkg.scripts['build:win']){console.error('MISSING build:win script');bad++}
for(const f of ['src/main/main.js','src/preload/preload.js','src/renderer/app.js','src/services/database.js']){try{cp.execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'});console.log('SYNTAX OK',f)}catch(e){console.error('SYNTAX ERROR',f,String(e.stderr||e.message));bad++}}
process.exitCode=bad?1:0;
