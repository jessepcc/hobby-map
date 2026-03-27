package http

import (
	"encoding/json"
	"net/http"
)

type compareRequest struct {
	IDs []string `json:"ids"`
}

func (h *Handlers) Compare(w http.ResponseWriter, r *http.Request) {
	var req compareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if len(req.IDs) < 2 || len(req.IDs) > 4 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "compare requires 2 to 4 hobby IDs"})
		return
	}

	var resp []hobbyResponse
	for _, id := range req.IDs {
		hobby, err := h.deps.HobbyRepo.GetByID(r.Context(), id)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "hobby " + id + " not found"})
			return
		}
		resp = append(resp, toHobbyResponse(hobby))
	}
	writeJSON(w, http.StatusOK, resp)
}
