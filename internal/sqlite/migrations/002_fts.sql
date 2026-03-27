CREATE VIRTUAL TABLE IF NOT EXISTS hobby_fts USING fts5(
  node_id UNINDEXED,
  name,
  aliases,
  short_desc,
  long_desc,
  concepts,
  tokenize = 'unicode61'
);

CREATE VIRTUAL TABLE IF NOT EXISTS node_fts USING fts5(
  node_id UNINDEXED,
  name,
  description,
  tokenize = 'unicode61'
);
