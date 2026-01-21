// src/main/db/schema.ts

export const SCHEMA_V5 = [
  // 1. PROJECTS
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    default_fps REAL,
    default_resolution TEXT,
    last_edited_at DATETIME
  );`,

  // 2. CANVASES
  `CREATE TABLE IF NOT EXISTS canvases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    fps REAL,
    resolution TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );`,

  // 3. TRANSACTION LOG (Undo/Redo)
  `CREATE TABLE IF NOT EXISTS transaction_log (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    action_type TEXT,
    undo_payload JSON,
    redo_payload JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );`,

  // 4. MEDIA LIBRARY (Includes Doc L Performance Columns)
  `CREATE TABLE IF NOT EXISTS media_library (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    fps REAL,
    duration_sec REAL,
    start_tc_string TEXT,
    proxy_status TEXT DEFAULT 'PENDING',
    proxy_path TEXT,
    waveform_status TEXT DEFAULT 'PENDING',
    waveform_path TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
  );`,

  // 5. NODES (The Topology - Includes Doc E Retiming)
  `CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    canvas_id TEXT NOT NULL,
    type TEXT NOT NULL,
    asset_id TEXT,
    parent_id TEXT,
    anchor_type TEXT,
    container_id TEXT,
    drift INTEGER DEFAULT 0,
    media_in_point REAL DEFAULT 0,
    media_out_point REAL,
    playback_rate REAL DEFAULT 1.0,
    active_channels JSON,
    transition_in_type TEXT,
    transition_in_duration INTEGER DEFAULT 0,
    internal_state_map JSON,
    FOREIGN KEY(canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
  );`
];