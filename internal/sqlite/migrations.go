package sqlite

import (
	"database/sql"
	"embed"
	"fmt"
	"sort"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func RunMigrations(db *sql.DB) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})
	for _, entry := range entries {
		content, err := migrationsFS.ReadFile("migrations/" + entry.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		sql := string(content)
		if sql == "" || sql[0] == '-' {
			// Skip placeholder/comment-only migration files
			continue
		}
		if _, err := db.Exec(sql); err != nil {
			return fmt.Errorf("exec migration %s: %w", entry.Name(), err)
		}
	}

	// Idempotent schema additions that ALTER TABLE cannot guard with IF NOT EXISTS.
	addColumnIfMissing(db, "nodes", "name_zh", "TEXT NOT NULL DEFAULT ''")

	return nil
}

// addColumnIfMissing adds a column to a table if it does not already exist.
func addColumnIfMissing(db *sql.DB, table, column, colDef string) {
	rows, err := db.Query(fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return
	}
	defer rows.Close()
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull int
		var dfltValue *string
		var pk int
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return
		}
		if name == column {
			return // already exists
		}
	}
	db.Exec(fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, colDef))
}
