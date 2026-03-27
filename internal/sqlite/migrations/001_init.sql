CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id, edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_to   ON edges(to_node_id, edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_pair ON edges(from_node_id, to_node_id);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(node_type);

CREATE TABLE IF NOT EXISTS hobbies (
  node_id TEXT PRIMARY KEY,
  short_desc TEXT NOT NULL,
  long_desc TEXT NOT NULL DEFAULT '',
  difficulty_summary TEXT NOT NULL DEFAULT '',
  starter_path TEXT NOT NULL DEFAULT '',
  popularity REAL NOT NULL DEFAULT 0.5,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hobby_aliases (
  hobby_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  PRIMARY KEY (hobby_id, alias),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dimensions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_value REAL NOT NULL DEFAULT 0.0,
  max_value REAL NOT NULL DEFAULT 1.0,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS hobby_dimensions (
  hobby_id TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  value REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (hobby_id, dimension_id),
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE,
  FOREIGN KEY (dimension_id) REFERENCES dimensions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS memory_sessions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  extracted_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS memory_signals (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  text TEXT NOT NULL,
  normalized_value TEXT NOT NULL DEFAULT '',
  weight REAL NOT NULL DEFAULT 1.0,
  confidence REAL NOT NULL DEFAULT 1.0,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (memory_session_id) REFERENCES memory_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_signals_session ON memory_signals(memory_session_id, signal_type);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id TEXT PRIMARY KEY,
  memory_session_id TEXT,
  filters_json TEXT NOT NULL DEFAULT '{}',
  ranking_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_session_id) REFERENCES memory_sessions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendation_results (
  run_id TEXT NOT NULL,
  hobby_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  final_score REAL NOT NULL,
  dense_score REAL NOT NULL DEFAULT 0,
  lexical_score REAL NOT NULL DEFAULT 0,
  graph_score REAL NOT NULL DEFAULT 0,
  dimension_score REAL NOT NULL DEFAULT 0,
  outcome_score REAL NOT NULL DEFAULT 0,
  novelty_score REAL NOT NULL DEFAULT 0,
  barrier_penalty REAL NOT NULL DEFAULT 0,
  reasons_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (run_id, hobby_id),
  FOREIGN KEY (run_id) REFERENCES recommendation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS node_embeddings (
  node_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id TEXT PRIMARY KEY,
  hobby_id TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hobby_id) REFERENCES hobbies(node_id) ON DELETE CASCADE
);
