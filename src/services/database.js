const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uid = () => crypto.randomUUID();
class DatabaseService {
  constructor(file, migrationsDir) { this.file=file; this.migrationsDir=migrationsDir; this.db=new Database(file); this.db.pragma('foreign_keys = ON'); this.db.pragma('journal_mode = WAL'); }
  migrate() {
    this.db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
    const done = new Set(this.db.prepare('SELECT version FROM schema_migrations').all().map(x=>x.version));
    for (const file of fs.readdirSync(this.migrationsDir).filter(x=>x.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      const sql=fs.readFileSync(path.join(this.migrationsDir,file),'utf8');
      const tx=this.db.transaction(()=>{ this.db.exec(sql); this.db.prepare('INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)').run(file,new Date().toISOString()); }); tx();
    }
  }
  dashboardSummary(){
    const one=(sql)=>this.db.prepare(sql).get().n;
    return { assets:one('SELECT COUNT(*) n FROM asset WHERE deleted_at IS NULL'), available:one("SELECT COUNT(*) n FROM asset WHERE deleted_at IS NULL AND status='AVAILABLE'"), usageOpen:one("SELECT COUNT(*) n FROM usage_request WHERE deleted_at IS NULL AND usage_status NOT IN ('CLOSED','CANCELLED')"), maintenanceOpen:one("SELECT COUNT(*) n FROM maintenance_work_order WHERE deleted_at IS NULL AND status NOT IN ('CLOSED','CANCELLED')") };
  }
  listAssets(q=''){ return this.db.prepare(`SELECT id,asset_code,name,registration_no,asset_kind,status,current_meter,current_meter_unit FROM asset WHERE deleted_at IS NULL AND (asset_code LIKE ? OR name LIKE ? OR registration_no LIKE ?) ORDER BY asset_code LIMIT 200`).all(...Array(3).fill(`%${q}%`)); }
  listUsageRequests(){ return this.db.prepare(`SELECT u.*, a.asset_code assigned_asset_code FROM usage_request u LEFT JOIN asset a ON a.id=u.assigned_asset_id WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC LIMIT 200`).all(); }
  createUsageRequest(p){
    const id=uid(), now=new Date().toISOString();
    this.db.prepare(`INSERT INTO usage_request(id,request_no,requester_name,department_name,purpose,destination,planned_start_at,planned_end_at,requested_asset_id,assigned_asset_id,approval_status,usage_status,meter_before,meter_unit,fuel_before,created_at,updated_at,version_no,sync_status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,p.request_no||`REQ-${Date.now()}`,p.requester_name,p.department_name||null,p.purpose,p.destination||null,p.planned_start_at,p.planned_end_at,p.requested_asset_id||null,p.assigned_asset_id||null,'PENDING_DOCUMENT','DRAFT',p.meter_before||null,p.meter_unit||'KM',p.fuel_before||null,now,now,1,'LOCAL');
    this.audit('usage_request',id,'CREATE',null,p); return {id};
  }
  updateUsageStatus(p){
    const old=this.db.prepare('SELECT * FROM usage_request WHERE id=?').get(p.id); if(!old) throw new Error('Usage request not found');
    const now=new Date().toISOString();
    this.db.prepare(`UPDATE usage_request SET approval_status=COALESCE(?,approval_status), usage_status=COALESCE(?,usage_status), approved_by_name=COALESCE(?,approved_by_name), approved_at=COALESCE(?,approved_at), approval_document_ref=COALESCE(?,approval_document_ref), meter_before=COALESCE(?,meter_before), assigned_asset_id=COALESCE(?,assigned_asset_id), updated_at=?, version_no=version_no+1 WHERE id=?`).run(p.approval_status||null,p.usage_status||null,p.approved_by_name||null,p.approved_at||null,p.approval_document_ref||null,p.meter_before??null,p.assigned_asset_id||null,now,p.id);
    this.audit('usage_request',p.id,'STATUS_UPDATE',old,p); return {ok:true};
  }
  recordReturn(p){
    const old=this.db.prepare('SELECT * FROM usage_request WHERE id=?').get(p.id); if(!old) throw new Error('Usage request not found');
    const now=new Date().toISOString();
    this.db.prepare(`UPDATE usage_request SET returned_at=?, meter_after=?, fuel_after=?, condition_after=?, incident_flag=?, return_note=?, returned_by_name=?, received_by_name=?, usage_status='CLOSED', updated_at=?, version_no=version_no+1 WHERE id=?`).run(p.returned_at||now,p.meter_after,p.fuel_after||null,p.condition_after||null,p.incident_flag?1:0,p.return_note||null,p.returned_by_name||null,p.received_by_name||null,now,p.id);
    if(p.meter_after!=null && old.assigned_asset_id){ this.db.prepare('UPDATE asset SET current_meter=?, updated_at=?, version_no=version_no+1 WHERE id=?').run(p.meter_after,now,old.assigned_asset_id); this.db.prepare('INSERT INTO meter_reading(id,asset_id,reading_value,unit,reading_at,source_type,source_id,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid(),old.assigned_asset_id,p.meter_after,old.meter_unit||'KM',p.returned_at||now,'USAGE_RETURN',p.id,now); }
    this.audit('usage_request',p.id,'RETURN',old,p); return {ok:true};
  }
  audit(entity,id,action,before,after){ this.db.prepare('INSERT INTO audit_log(id,entity_type,entity_id,action,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)').run(uid(),entity,id,action,before?JSON.stringify(before):null,after?JSON.stringify(after):null,new Date().toISOString()); }
  backup(target){ this.db.backup(target); }
}
module.exports={DatabaseService};
