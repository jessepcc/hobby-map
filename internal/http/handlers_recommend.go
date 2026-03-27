package http

import (
	"encoding/json"
	"net/http"

	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
)

type recommendRequest struct {
	MemorySessionID string                `json:"memorySessionId"`
	Signals         []domain.MemorySignal `json:"signals"`
	Filters         map[string]float64    `json:"filters"`
	Limit           int                   `json:"limit"`
}

type recommendResponse struct {
	Results []candidateResp `json:"results"`
}

type candidateResp struct {
	HobbyID   string           `json:"hobbyId"`
	HobbyName string           `json:"hobbyName"`
	Rank      int              `json:"rank"`
	Score     float64          `json:"score"`
	Reasons   []string         `json:"reasons"`
	Caution   string           `json:"caution"`
	Radar     domain.RadarAxes `json:"radar"`
	Scores    scoreBreakdown   `json:"scores"`
}

type scoreBreakdown struct {
	Vector    float64 `json:"vector"`
	FTS       float64 `json:"fts"`
	Graph     float64 `json:"graph"`
	Dimension float64 `json:"dimension"`
	Outcome   float64 `json:"outcome"`
	Novelty   float64 `json:"novelty"`
	Barrier   float64 `json:"barrier"`
}

func (h *Handlers) Recommend(w http.ResponseWriter, r *http.Request) {
	var req recommendRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}

	var signals []domain.MemorySignal

	if len(req.Signals) > 0 {
		signals = req.Signals
	} else if req.MemorySessionID != "" && h.deps.MemRepo != nil {
		var err error
		signals, err = h.deps.MemRepo.GetSignals(r.Context(), req.MemorySessionID)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session"})
			return
		}
	}

	if len(signals) == 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "no signals — provide signals or memorySessionId"})
		return
	}

	filter := repo.ListFilter{Limit: req.Limit}
	if filter.Limit == 0 {
		filter.Limit = 20
	}
	if req.Filters != nil {
		if v, ok := req.Filters["startup_cost_max"]; ok {
			filter.StartupCostMax = &v
		}
		if v, ok := req.Filters["physical_demand_max"]; ok {
			filter.PhysicalDemandMax = &v
		}
		if v, ok := req.Filters["space_required_max"]; ok {
			filter.SpaceRequiredMax = &v
		}
	}

	results, err := h.deps.Retrieval.Recommend(r.Context(), signals, filter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	resp := recommendResponse{Results: make([]candidateResp, 0, len(results))}
	for i, c := range results {
		hobby, err := h.deps.HobbyRepo.GetByID(r.Context(), c.HobbyID)
		if err != nil {
			continue
		}
		resp.Results = append(resp.Results, candidateResp{
			HobbyID:   c.HobbyID,
			HobbyName: c.HobbyName,
			Rank:      i + 1,
			Score:     c.FinalScore,
			Reasons:   c.Reasons,
			Caution:   c.Caution,
			Radar:     domain.ComputeRadar(hobby.Dimensions),
			Scores: scoreBreakdown{
				Vector:    c.VectorScore,
				FTS:       c.FTSScore,
				Graph:     c.GraphScore,
				Dimension: c.DimensionScore,
				Outcome:   c.OutcomeScore,
				Novelty:   c.NoveltyScore,
				Barrier:   c.BarrierPenalty,
			},
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handlers) SaveFeedback(w http.ResponseWriter, r *http.Request) {
	h.handleFeedback(w, r, "saved")
}

func (h *Handlers) DismissFeedback(w http.ResponseWriter, r *http.Request) {
	h.handleFeedback(w, r, "dismissed")
}

func (h *Handlers) handleFeedback(w http.ResponseWriter, r *http.Request, action string) {
	var req struct {
		HobbyID string `json:"hobbyId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.HobbyID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "hobbyId required"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "action": action})
}
