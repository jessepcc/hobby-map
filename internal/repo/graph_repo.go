package repo

import (
	"context"
	"database/sql"

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
		"SELECT id, node_type, slug, name, description FROM nodes WHERE id = ?", id).
		Scan(&n.ID, &n.Type, &n.Slug, &n.Name, &n.Description)
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

// ExpandToHobbies does BFS from seed nodes up to maxHops, returning hobbies found
// with graph scores computed as: sum(pathWeight / (1.0 + 0.35*hops)).
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
	}

	hobbyScores := make(map[string]float64)
	visited := make(map[string]bool)
	queue := make([]visit, 0, len(seedNodeIDs))

	for _, id := range seedNodeIDs {
		queue = append(queue, visit{nodeID: id, hops: 0, pathWeight: 1.0})
		visited[id] = true
	}

	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]

		// Check if this node is a hobby
		var nodeType string
		r.db.QueryRowContext(ctx, "SELECT node_type FROM nodes WHERE id = ?", v.nodeID).Scan(&nodeType)
		if nodeType == "hobby" {
			score := v.pathWeight / (1.0 + 0.35*float64(v.hops))
			hobbyScores[v.nodeID] += score
		}

		if v.hops >= maxHops {
			continue
		}

		// Expand outgoing edges
		edges, err := r.getEdgesBoth(ctx, v.nodeID)
		if err != nil {
			continue
		}
		for _, e := range edges {
			neighbor := e.ToNodeID
			if neighbor == v.nodeID {
				neighbor = e.FromNodeID
			}
			if visited[neighbor] || e.Weight < 0.4 {
				continue
			}
			visited[neighbor] = true
			queue = append(queue, visit{
				nodeID:     neighbor,
				hops:       v.hops + 1,
				pathWeight: v.pathWeight * e.Weight,
			})
		}
	}

	// Convert to sorted slice
	results := make([]ScoredID, 0, len(hobbyScores))
	for id, score := range hobbyScores {
		results = append(results, ScoredID{ID: id, Score: score})
	}
	// Sort descending
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Score > results[i].Score {
				results[i], results[j] = results[j], results[i]
			}
		}
	}
	if len(results) > limit {
		results = results[:limit]
	}
	return results, nil
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
