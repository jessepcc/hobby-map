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
	VectorResults   []vectorResult        `json:"vectorResults"`
	Limit           int                   `json:"limit"`
}

type recommendResponse struct {
	Results []candidateResp `json:"results"`
}

type vectorResult struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}

type candidateResp struct {
	HobbyID   string           `json:"hobbyId"`
	HobbyName string           `json:"hobbyName"`
	Rank      int              `json:"rank"`
	Reasons   []string         `json:"reasons"`
	Caution   string           `json:"caution"`
	Radar     domain.RadarAxes `json:"radar"`
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
		mapFilter := func(key string, target **float64) {
			if v, ok := req.Filters[key]; ok {
				*target = &v
			}
		}
		mapFilter("startup_cost_max", &filter.StartupCostMax)
		mapFilter("ongoing_cost_max", &filter.OngoingCostMax)
		mapFilter("time_per_session_max", &filter.TimePerSessionMax)
		mapFilter("physical_demand_max", &filter.PhysicalDemandMax)
		mapFilter("space_required_max", &filter.SpaceRequiredMax)
		mapFilter("social_dependency_max", &filter.SocialDependencyMax)
	}

	var vecResults []repo.ScoredID
	for _, vr := range req.VectorResults {
		vecResults = append(vecResults, repo.ScoredID{ID: vr.ID, Score: vr.Score})
	}
	results, err := h.deps.Retrieval.Recommend(r.Context(), signals, filter, vecResults)
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
			Reasons:   c.Reasons,
			Caution:   c.Caution,
			Radar:     domain.ComputeRadar(hobby.Dimensions),
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
	if h.deps.MemRepo != nil {
		h.deps.MemRepo.SaveFeedback(r.Context(), req.HobbyID, action)
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "action": action})
}
