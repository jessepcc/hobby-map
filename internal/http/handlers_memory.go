package http

import (
	"encoding/json"
	"net/http"
)

type extractRequest struct {
	Source string `json:"source"`
	Text   string `json:"text"`
}

type extractResponse struct {
	MemorySessionID string       `json:"memorySessionId"`
	Signals         []signalResp `json:"signals"`
}

type signalResp struct {
	Type            string  `json:"type"`
	Text            string  `json:"text"`
	NormalizedValue string  `json:"normalizedValue"`
	Weight          float64 `json:"weight"`
}

func (h *Handlers) ExtractMemory(w http.ResponseWriter, r *http.Request) {
	if h.deps.Memory == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "LLM not configured — set LLM_API_KEY"})
		return
	}

	var req extractRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if req.Text == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "text is required"})
		return
	}
	if req.Source == "" {
		req.Source = "manual_paste"
	}

	sessionID, signals, err := h.deps.Memory.ExtractAndSave(r.Context(), req.Source, req.Text)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	resp := extractResponse{MemorySessionID: sessionID}
	for _, s := range signals {
		resp.Signals = append(resp.Signals, signalResp{
			Type:            s.SignalType,
			Text:            s.Text,
			NormalizedValue: s.NormalizedValue,
			Weight:          s.Weight,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}
