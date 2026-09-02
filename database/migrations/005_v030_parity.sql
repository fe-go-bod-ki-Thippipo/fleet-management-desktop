CREATE TABLE IF NOT EXISTS master_item (
  id TEXT PRIMARY KEY,
  master_type TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id TEXT,
  metadata_json TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(master_type, code),
  FOREIGN KEY(parent_id) REFERENCES master_item(id)
);
CREATE INDEX IF NOT EXISTS idx_master_type ON master_item(master_type,active,name);

CREATE TABLE IF NOT EXISTS person_role (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  role_code TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(person_id,role_code),
  FOREIGN KEY(person_id) REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS asset_photo (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  caption TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY(asset_id) REFERENCES asset(id)
);

CREATE TABLE IF NOT EXISTS document_detail (
  document_id TEXT PRIMARY KEY,
  insurer_name TEXT,
  policy_no TEXT,
  insurance_class TEXT,
  insured_amount REAL,
  repair_condition TEXT,
  premium REAL,
  coverage_start TEXT,
  coverage_end TEXT,
  renewal_date TEXT,
  tax_amount REAL,
  metadata_json TEXT,
  FOREIGN KEY(document_id) REFERENCES asset_document(id)
);

CREATE TABLE IF NOT EXISTS app_setting (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_document_expiry ON asset_document(expiry_date,active,deleted_at);
CREATE INDEX IF NOT EXISTS idx_asset_photo_asset ON asset_photo(asset_id,is_primary,deleted_at);

INSERT OR IGNORE INTO master_item(id,master_type,code,name,active,created_at,updated_at) VALUES
('VT01','VEHICLE_TYPE','VT01','รถยนต์/ยานพาหนะ',1,datetime('now'),datetime('now')),
('VT02','VEHICLE_TYPE','VT02','เครื่องจักร',1,datetime('now'),datetime('now')),
('BR01','BRAND','BR01','Toyota',1,datetime('now'),datetime('now')),
('BR02','BRAND','BR02','Mitsubishi',1,datetime('now'),datetime('now')),
('CL01','COLOR','CL01','ขาว',1,datetime('now'),datetime('now')),
('CL02','COLOR','CL02','ดำ',1,datetime('now'),datetime('now')),
('BT01','BODY_TYPE','BT01','กระบะ',1,datetime('now'),datetime('now')),
('FT01','FUEL_TYPE','FT01','ดีเซล',1,datetime('now'),datetime('now')),
('DT01','DOCUMENT_TYPE','DT01','ภาษีรถ',1,datetime('now'),datetime('now')),
('DT02','DOCUMENT_TYPE','DT02','พ.ร.บ.',1,datetime('now'),datetime('now')),
('DT03','DOCUMENT_TYPE','DT03','ประกันภัย',1,datetime('now'),datetime('now')),
('DT04','DOCUMENT_TYPE','DT04','ตรวจสภาพ',1,datetime('now'),datetime('now'));
