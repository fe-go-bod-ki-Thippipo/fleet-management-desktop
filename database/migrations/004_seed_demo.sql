INSERT OR IGNORE INTO company(id,code,name,created_at,updated_at) VALUES ('CMP-DEMO','CBH','บริษัท งานทวีพี่น้อง จำกัด',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO site(id,code,name,company_id) VALUES ('SITE-CENTRAL','CENTRAL','ส่วนกลาง','CMP-DEMO');
INSERT OR IGNORE INTO owner_registry(id,owner_code,owner_type,reference_type,reference_id,display_name,usage_classification,active) VALUES ('OWN-CBH','OW01','COMPANY','COMPANY','CMP-DEMO','บริษัท งานทวีพี่น้อง จำกัด','COMPANY_OWNED',1);
INSERT OR IGNORE INTO asset(id,asset_code,name,asset_kind,company_id,site_id,owner_id,registration_no,status,current_meter,current_meter_unit,created_at,updated_at) VALUES
('AST-DEMO-1','FL-001','รถกระบะส่วนกลาง','VEHICLE','CMP-DEMO','SITE-CENTRAL','OWN-CBH','ทดลอง 0001','AVAILABLE',45210,'KM',datetime('now'),datetime('now')),
('AST-DEMO-2','MC-001','รถแทรกเตอร์ตัวอย่าง','MACHINERY','CMP-DEMO','SITE-CENTRAL','OWN-CBH',NULL,'AVAILABLE',1280,'HOUR',datetime('now'),datetime('now'));
