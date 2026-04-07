package http

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"hobby-map/internal/app"
	"hobby-map/internal/domain"
	"hobby-map/internal/repo"
)

type Handlers struct {
	deps *app.Dependencies
}

type hobbyResponse struct {
	ID                string             `json:"id"`
	Slug              string             `json:"slug"`
	Name              string             `json:"name"`
	NameZH            string             `json:"nameZh,omitempty"`
	ShortDesc         string             `json:"shortDesc"`
	LongDesc          string             `json:"longDesc"`
	DifficultySummary string             `json:"difficultySummary"`
	StarterPath       string             `json:"starterPath"`
	Popularity        float64            `json:"popularity"`
	Dimensions        map[string]float64 `json:"dimensions"`
	Aliases           []string           `json:"aliases"`
	Radar             domain.RadarAxes   `json:"radar"`
}

func toHobbyResponse(h *domain.Hobby) hobbyResponse {
	aliases := h.Aliases
	if aliases == nil {
		aliases = []string{}
	}
	dims := h.Dimensions
	if dims == nil {
		dims = make(map[string]float64)
	}
	return hobbyResponse{
		ID:                h.ID,
		Slug:              h.Slug,
		Name:              h.Name,
		NameZH:            h.NameZH,
		ShortDesc:         h.ShortDesc,
		LongDesc:          h.LongDesc,
		DifficultySummary: h.DifficultySummary,
		StarterPath:       h.StarterPath,
		Popularity:        h.Popularity,
		Dimensions:        dims,
		Aliases:           aliases,
		Radar:             domain.ComputeRadar(dims),
	}
}

func (h *Handlers) ListHobbies(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q != "" {
		results, err := h.deps.HobbyRepo.SearchFTS(r.Context(), q, 50)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		var hobbies []hobbyResponse
		for _, res := range results {
			hobby, err := h.deps.HobbyRepo.GetByID(r.Context(), res.ID)
			if err != nil {
				continue
			}
			hobbies = append(hobbies, toHobbyResponse(hobby))
		}
		if hobbies == nil {
			hobbies = []hobbyResponse{}
		}
		writeJSON(w, http.StatusOK, hobbies)
		return
	}

	filter := repo.ListFilter{
		Limit:  parseIntOr(r.URL.Query().Get("limit"), 50),
		Offset: parseIntOr(r.URL.Query().Get("offset"), 0),
	}
	filter.StartupCostMax = parseFloatPtr(r.URL.Query().Get("startup_cost_max"))
	filter.OngoingCostMax = parseFloatPtr(r.URL.Query().Get("ongoing_cost_max"))
	filter.TimePerSessionMax = parseFloatPtr(r.URL.Query().Get("time_per_session_max"))
	filter.PhysicalDemandMax = parseFloatPtr(r.URL.Query().Get("physical_demand_max"))
	filter.SpaceRequiredMax = parseFloatPtr(r.URL.Query().Get("space_required_max"))
	filter.SocialDependencyMax = parseFloatPtr(r.URL.Query().Get("social_dependency_max"))

	hobbies, err := h.deps.HobbyRepo.List(r.Context(), filter)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	resp := make([]hobbyResponse, len(hobbies))
	for i, hb := range hobbies {
		resp[i] = toHobbyResponse(&hb)
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *Handlers) GetHobby(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	hobby, err := h.deps.HobbyRepo.GetByID(r.Context(), id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "hobby not found"})
		return
	}
	writeJSON(w, http.StatusOK, toHobbyResponse(hobby))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func parseIntOr(s string, def int) int {
	if v, err := strconv.Atoi(s); err == nil {
		return v
	}
	return def
}

func parseFloatPtr(s string) *float64 {
	if s == "" {
		return nil
	}
	v, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil
	}
	return &v
}
