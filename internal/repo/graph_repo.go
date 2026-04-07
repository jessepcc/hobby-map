package repo

import (
	"context"
	"database/sql"
	"sort"

	"hobby-map/internal/domain"
)

type GraphRepo struct {
	db *sql.DB
}

func NewGraphRepo(db *sql.DB) *GraphRepo {
	return &GraphRepo{db: db}
}

func (r *GraphRepo) DB() *sql.DB {
	return r.db
}

func (r *GraphRepo) GetNode(ctx context.Context, id string) (*domain.Node, error) {
	var n domain.Node
	err := r.db.QueryRowContext(ctx,
		"SELECT id, node_type, slug, name, COALESCE(name_zh, ''), description FROM nodes WHERE id = ?", id).
		Scan(&n.ID, &n.Type, &n.Slug, &n.Name, &n.NameZH, &n.Description)
	if err != nil {
		return nil, err
	}
	return &n, nil
}

func (r *GraphRepo) GetEdgesFrom(ctx context.Context, nodeID string, edgeTypes []string) ([]domain.Edge, error) {
	query := "SELECT id, from_node_id, to_node_id, edge_type, weight FROM edges WHERE from_node_id = ?"
	args := []any{nodeID}

	if len(edgeTypes) > 0 {
		placeholders := make([]byte, 0, len(edgeTypes)*2)
		for i, et := range edgeTypes {
			if i > 0 {
				placeholders = append(placeholders, ',')
			}
			placeholders = append(placeholders, '?')
			args = append(args, et)
		}
		query += " AND edge_type IN (" + string(placeholders) + ")"
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var edges []domain.Edge
	for rows.Next() {
		var e domain.Edge
		rows.Scan(&e.ID, &e.FromNodeID, &e.ToNodeID, &e.Type, &e.Weight)
		edges = append(edges, e)
	}
	return edges, rows.Err()
}

func (r *GraphRepo) SearchNodeFTS(ctx context.Context, query string, limit int) ([]string, error) {
	query = buildFTSQuery([]string{query})
	if query == "" {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx,
		"SELECT node_id FROM node_fts WHERE node_fts MATCH ? LIMIT ?", query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []string
	for rows.Next() {
		var id string
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// ExpandToHobbies walks all simple paths from the seed set up to maxHops,
// accumulating support from each valid path into the final hobby score.
func (r *GraphRepo) ExpandToHobbies(ctx context.Context, seedNodeIDs []string, maxHops int, limit int) ([]ScoredID, error) {
	if maxHops > 3 {
		maxHops = 3
	}
	if limit == 0 {
		limit = 100
	}

	type visit struct {
		nodeID     string
		hops       int
		pathWeight float64
		path       []string
	}

	hobbyScores := make(map[string]float64)
	queue := make([]visit, 0, len(seedNodeIDs))
	nodeTypeCache := make(map[string]string)
	edgeCache := make(map[string][]domain.Edge)

	for _, id := range seedNodeIDs {
		queue = append(queue, visit{
			nodeID:     id,
			hops:       0,
			pathWeight: 1.0,
			path:       []string{id},
		})
	}

	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]

		// Check if this node is a hobby
		nodeType, err := r.nodeType(ctx, nodeTypeCache, v.nodeID)
		if err != nil {
			continue
		}
		if nodeType == "hobby" {
			score := v.pathWeight / (1.0 + 0.35*float64(v.hops))
			hobbyScores[v.nodeID] += score
		}

		if v.hops >= maxHops {
			continue
		}

		// Expand outgoing edges
		edges, err := r.cachedEdgesBoth(ctx, edgeCache, v.nodeID)
		if err != nil {
			continue
		}
		for _, e := range edges {
			neighbor := e.ToNodeID
			if neighbor == v.nodeID {
				neighbor = e.FromNodeID
			}
			if e.Weight < 0.4 || containsNode(v.path, neighbor) {
				continue
			}
			path := append(append([]string(nil), v.path...), neighbor)
			queue = append(queue, visit{
				nodeID:     neighbor,
				hops:       v.hops + 1,
				pathWeight: v.pathWeight * e.Weight,
				path:       path,
			})
		}
	}

	// Convert to sorted slice
	results := make([]ScoredID, 0, len(hobbyScores))
	for id, score := range hobbyScores {
		results = append(results, ScoredID{ID: id, Score: score})
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})
	if len(results) > limit {
		results = results[:limit]
	}
	return results, nil
}

func (r *GraphRepo) nodeType(ctx context.Context, cache map[string]string, nodeID string) (string, error) {
	if nodeType, ok := cache[nodeID]; ok {
		return nodeType, nil
	}

	var nodeType string
	if err := r.db.QueryRowContext(ctx, "SELECT node_type FROM nodes WHERE id = ?", nodeID).Scan(&nodeType); err != nil {
		return "", err
	}
	cache[nodeID] = nodeType
	return nodeType, nil
}

func (r *GraphRepo) cachedEdgesBoth(ctx context.Context, cache map[string][]domain.Edge, nodeID string) ([]domain.Edge, error) {
	if edges, ok := cache[nodeID]; ok {
		return edges, nil
	}

	edges, err := r.getEdgesBoth(ctx, nodeID)
	if err != nil {
		return nil, err
	}
	cache[nodeID] = edges
	return edges, nil
}

func containsNode(path []string, nodeID string) bool {
	for _, current := range path {
		if current == nodeID {
			return true
		}
	}
	return false
}

func (r *GraphRepo) getEdgesBoth(ctx context.Context, nodeID string) ([]domain.Edge, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, from_node_id, to_node_id, edge_type, weight FROM edges WHERE from_node_id = ? OR to_node_id = ?",
		nodeID, nodeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var edges []domain.Edge
	for rows.Next() {
		var e domain.Edge
		rows.Scan(&e.ID, &e.FromNodeID, &e.ToNodeID, &e.Type, &e.Weight)
		edges = append(edges, e)
	}
	return edges, rows.Err()
}
