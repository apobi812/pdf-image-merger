CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL,
  event TEXT NOT NULL,
  tool TEXT NOT NULL,
  route TEXT NOT NULL,
  lang TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'XX',
  visitor_hash TEXT NOT NULL,
  session_id TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT 'other',
  screen TEXT NOT NULL DEFAULT '',
  referrer_host TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_events_day ON events (day);
CREATE INDEX IF NOT EXISTS idx_events_tool ON events (tool);
CREATE INDEX IF NOT EXISTS idx_events_event ON events (event);
CREATE INDEX IF NOT EXISTS idx_events_country ON events (country);
CREATE INDEX IF NOT EXISTS idx_events_lang ON events (lang);
CREATE INDEX IF NOT EXISTS idx_events_visitor_day ON events (visitor_hash, day);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits (expires_at);
