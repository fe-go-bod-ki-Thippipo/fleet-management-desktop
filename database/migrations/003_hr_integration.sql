-- Fleet Desktop ↔ HR Integration schema extension v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hr_integration_source (
  id TEXT PRIMARY KEY,
  source_code TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  last_import_at TEXT,
  last_package_id TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS hr_person_mapping (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  hr_employee_ref TEXT NOT NULL,
  person_id TEXT NOT NULL,
  last_hr_updated_at TEXT,
  last_synced_at TEXT,
  UNIQUE(source_id, hr_employee_ref),
  FOREIGN KEY (source_id) REFERENCES hr_integration_source(id),
  FOREIGN KEY (person_id) REFERENCES person(id)
);

CREATE TABLE IF NOT EXISTS organization_mapping (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  mapping_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  fleet_ref TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(source_id, mapping_type, source_ref),
  FOREIGN KEY (source_id) REFERENCES hr_integration_source(id)
);

CREATE TABLE IF NOT EXISTS integration_import_log (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  imported_by TEXT,
  device_id TEXT,
  total_records INTEGER NOT NULL DEFAULT 0,
  inserted_records INTEGER NOT NULL DEFAULT 0,
  updated_records INTEGER NOT NULL DEFAULT 0,
  skipped_records INTEGER NOT NULL DEFAULT 0,
  error_records INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL,
  detail_json TEXT,
  FOREIGN KEY (source_id) REFERENCES hr_integration_source(id)
);

CREATE TABLE IF NOT EXISTS integration_review_queue (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  person_id TEXT,
  issue_type TEXT NOT NULL,
  source_value TEXT,
  fleet_value TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  FOREIGN KEY (source_id) REFERENCES hr_integration_source(id),
  FOREIGN KEY (person_id) REFERENCES person(id)
);
