package search

import (
	"sort"

	"hobby-map/internal/repo"
)

// RRF weights — FTS captures direct interest matches, graph provides discovery
const (
	WVector = 1.0
	WFTS    = 2.0
	WGraph  = 0.6
)

// RRFMerge merges candidate lists from FTS, graph, and vector channels using
// Reciprocal Rank Fusion: RRF(h) = sum( w_m / (k + rank_m(h)) )
func RRFMerge(fts, graph, vector []repo.ScoredID, k float64) []repo.ScoredID {
	scores := make(map[string]float64)

	addChannel := func(results []repo.ScoredID, weight float64) {
		for rank, r := range results {
			scores[r.ID] += weight / (k + float64(rank+1))
		}
	}

	addChannel(fts, WFTS)
	addChannel(graph, WGraph)
	addChannel(vector, WVector)

	out := make([]repo.ScoredID, 0, len(scores))
	for id, score := range scores {
		out = append(out, repo.ScoredID{ID: id, Score: score})
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Score > out[j].Score
	})
	return out
}
