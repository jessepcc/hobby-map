package testutil

import (
	"database/sql"
	"testing"

	dbpkg "hobby-map/internal/sqlite"
)

func TestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := dbpkg.Open(":memory:")
	if err != nil {
		t.Fatalf("testutil.TestDB: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
