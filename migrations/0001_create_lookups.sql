-- One row per new profile a visitor looked up. `visitor` is a salted SHA-256 of the IP,
-- never the IP itself. Rows older than a day are deleted by the Worker.
CREATE TABLE lookups (
  visitor TEXT NOT NULL,
  login TEXT NOT NULL,
  at INTEGER NOT NULL
);

CREATE INDEX lookups_visitor_at ON lookups (visitor, at);
CREATE INDEX lookups_at ON lookups (at);
