package seed

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type hobbyJSON struct {
	ID                string             `json:"id"`
	Slug              string             `json:"slug"`
	Name              string             `json:"name"`
	Description       string             `json:"description"`
	ShortDesc         string             `json:"short_desc"`
	LongDesc          string             `json:"long_desc"`
	DifficultySummary string             `json:"difficulty_summary"`
	StarterPath       string             `json:"starter_path"`
	Popularity        float64            `json:"popularity"`
	Aliases           []string           `json:"aliases"`
	Dimensions        map[string]float64 `json:"dimensions"`
	Metadata          map[string]any     `json:"metadata"`
}

type conceptJSON struct {
	ID          string `json:"id"`
	NodeType    string `json:"node_type"`
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type edgeJSON struct {
	ID         string         `json:"id"`
	FromNodeID string         `json:"from_node_id"`
	ToNodeID   string         `json:"to_node_id"`
	EdgeType   string         `json:"edge_type"`
	Weight     float64        `json:"weight"`
	Metadata   map[string]any `json:"metadata"`
}

type dimensionJSON struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	Label       string  `json:"label"`
	MinValue    float64 `json:"min_value"`
	MaxValue    float64 `json:"max_value"`
	Description string  `json:"description"`
}

func Load(db *sql.DB, seedsDir string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	if err := loadDimensions(tx, seedsDir); err != nil {
		return fmt.Errorf("load dimensions: %w", err)
	}
	if err := loadConcepts(tx, seedsDir); err != nil {
		return fmt.Errorf("load concepts: %w", err)
	}
	if err := loadHobbies(tx, seedsDir); err != nil {
		return fmt.Errorf("load hobbies: %w", err)
	}
	if err := loadEdges(tx, seedsDir); err != nil {
		return fmt.Errorf("load edges: %w", err)
	}
	if err := populateFTS(tx); err != nil {
		return fmt.Errorf("populate fts: %w", err)
	}

	return tx.Commit()
}

func loadDimensions(tx *sql.Tx, dir string) error {
	var dims []dimensionJSON
	if err := readJSON(filepath.Join(dir, "dimensions.json"), &dims); err != nil {
		return err
	}
	stmt, err := tx.Prepare(`INSERT OR REPLACE INTO dimensions (id, key, label, min_value, max_value, description) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, d := range dims {
		if _, err := stmt.Exec(d.ID, d.Key, d.Label, d.MinValue, d.MaxValue, d.Description); err != nil {
			return fmt.Errorf("insert dimension %s: %w", d.Key, err)
		}
	}
	return nil
}

func loadConcepts(tx *sql.Tx, dir string) error {
	var concepts []conceptJSON
	if err := readJSON(filepath.Join(dir, "concepts.json"), &concepts); err != nil {
		return err
	}
	stmt, err := tx.Prepare(`INSERT OR IGNORE INTO nodes (id, node_type, slug, name, description) VALUES (?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, c := range concepts {
		nodeType := c.NodeType
		if nodeType == "" {
			nodeType = "concept"
		}
		if _, err := stmt.Exec(c.ID, nodeType, c.Slug, c.Name, c.Description); err != nil {
			return fmt.Errorf("insert concept %s: %w", c.Slug, err)
		}
	}
	return nil
}

func loadHobbies(tx *sql.Tx, dir string) error {
	var hobbies []hobbyJSON
	if err := readJSON(filepath.Join(dir, "hobbies.json"), &hobbies); err != nil {
		return err
	}
	nodeStmt, err := tx.Prepare(`INSERT OR REPLACE INTO nodes (id, node_type, slug, name, description, metadata_json) VALUES (?, 'hobby', ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer nodeStmt.Close()

	hobbyStmt, err := tx.Prepare(`INSERT OR REPLACE INTO hobbies (node_id, short_desc, long_desc, difficulty_summary, starter_path, popularity) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer hobbyStmt.Close()

	aliasStmt, err := tx.Prepare(`INSERT OR REPLACE INTO hobby_aliases (hobby_id, alias) VALUES (?, ?)`)
	if err != nil {
		return err
	}
	defer aliasStmt.Close()

	dimStmt, err := tx.Prepare(`INSERT OR REPLACE INTO hobby_dimensions (hobby_id, dimension_id, value) VALUES (?, ?, ?)`)
	if err != nil {
		return err
	}
	defer dimStmt.Close()

	for _, h := range hobbies {
		metaJSON, _ := json.Marshal(h.Metadata)
		if _, err := nodeStmt.Exec(h.ID, h.Slug, h.Name, h.Description, string(metaJSON)); err != nil {
			return fmt.Errorf("insert hobby node %s: %w", h.Slug, err)
		}
		if _, err := hobbyStmt.Exec(h.ID, h.ShortDesc, h.LongDesc, h.DifficultySummary, h.StarterPath, h.Popularity); err != nil {
			return fmt.Errorf("insert hobby %s: %w", h.Slug, err)
		}
		for _, alias := range h.Aliases {
			if _, err := aliasStmt.Exec(h.ID, alias); err != nil {
				return fmt.Errorf("insert alias for %s: %w", h.Slug, err)
			}
		}
		for key, val := range h.Dimensions {
			dimID := "d_" + key
			if _, err := dimStmt.Exec(h.ID, dimID, val); err != nil {
				return fmt.Errorf("insert dim %s for %s: %w", key, h.Slug, err)
			}
		}
	}
	return nil
}

func loadEdges(tx *sql.Tx, dir string) error {
	var edges []edgeJSON
	if err := readJSON(filepath.Join(dir, "edges.json"), &edges); err != nil {
		return err
	}

	// Build set of inserted node IDs to skip edges referencing non-existent nodes
	// (seed data has duplicate concept slugs; the second ID is never inserted)
	nodeIDs := make(map[string]bool)
	rows, err := tx.Query("SELECT id FROM nodes")
	if err != nil {
		return fmt.Errorf("query node ids: %w", err)
	}
	for rows.Next() {
		var id string
		rows.Scan(&id)
		nodeIDs[id] = true
	}
	rows.Close()

	stmt, err := tx.Prepare(`INSERT OR IGNORE INTO edges (id, from_node_id, to_node_id, edge_type, weight, metadata_json) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, e := range edges {
		if !nodeIDs[e.FromNodeID] || !nodeIDs[e.ToNodeID] {
			continue
		}
		metaJSON, _ := json.Marshal(e.Metadata)
		if _, err := stmt.Exec(e.ID, e.FromNodeID, e.ToNodeID, e.EdgeType, e.Weight, string(metaJSON)); err != nil {
			return fmt.Errorf("insert edge %s: %w", e.ID, err)
		}
	}
	return nil
}

func populateFTS(tx *sql.Tx) error {
	// Clear existing FTS data
	if _, err := tx.Exec("DELETE FROM hobby_fts"); err != nil {
		return err
	}

	rows, err := tx.Query(`
		SELECT n.id, n.name, h.short_desc, h.long_desc
		FROM nodes n
		JOIN hobbies h ON h.node_id = n.id
		WHERE n.node_type = 'hobby'
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	ftsStmt, err := tx.Prepare(`INSERT INTO hobby_fts (node_id, name, aliases, short_desc, long_desc, concepts) VALUES (?, ?, ?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	defer ftsStmt.Close()

	for rows.Next() {
		var id, name, shortDesc, longDesc string
		if err := rows.Scan(&id, &name, &shortDesc, &longDesc); err != nil {
			return err
		}
		aliases := getAliases(tx, id)
		concepts := getConcepts(tx, id)
		if _, err := ftsStmt.Exec(id, name, aliases, shortDesc, longDesc, concepts); err != nil {
			return fmt.Errorf("insert fts for %s: %w", id, err)
		}
	}
	return rows.Err()
}

func getAliases(tx *sql.Tx, hobbyID string) string {
	rows, err := tx.Query("SELECT alias FROM hobby_aliases WHERE hobby_id = ?", hobbyID)
	if err != nil {
		return ""
	}
	defer rows.Close()
	var aliases []string
	for rows.Next() {
		var a string
		rows.Scan(&a)
		aliases = append(aliases, a)
	}
	return strings.Join(aliases, " ")
}

func getConcepts(tx *sql.Tx, hobbyID string) string {
	rows, err := tx.Query(`
		SELECT n.name FROM edges e
		JOIN nodes n ON n.id = e.to_node_id
		WHERE e.from_node_id = ? AND n.node_type = 'concept'
		UNION
		SELECT n.name FROM edges e
		JOIN nodes n ON n.id = e.from_node_id
		WHERE e.to_node_id = ? AND n.node_type = 'concept'
	`, hobbyID, hobbyID)
	if err != nil {
		return ""
	}
	defer rows.Close()
	var concepts []string
	for rows.Next() {
		var c string
		rows.Scan(&c)
		concepts = append(concepts, c)
	}
	return strings.Join(concepts, " ")
}

func readJSON(path string, v any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	return json.Unmarshal(data, v)
}
