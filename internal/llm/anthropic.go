package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/google/uuid"

	"hobby-map/internal/domain"
)

type AnthropicExtractor struct {
	apiKey string
	client *http.Client
}

func NewAnthropicExtractor(apiKey string) *AnthropicExtractor {
	return &AnthropicExtractor{apiKey: apiKey, client: &http.Client{}}
}

func (e *AnthropicExtractor) ExtractSignals(ctx context.Context, text string) ([]domain.MemorySignal, error) {
	prompt := fmt.Sprintf(`Extract structured signals from this memory text. Return a JSON array of objects with these fields:
- "signal_type": one of "interest", "lifestyle_constraint", "desired_experience"
- "text": the original phrase from the memory
- "normalized_value": a snake_case normalized form (e.g., "japanese_history", "low_cost", "meaningful_hobby")
- "weight": confidence 0.0-1.0

Memory text: %q

Return ONLY a JSON array, no explanation.`, text)

	reqBody, _ := json.Marshal(map[string]any{
		"model":      "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages":   []map[string]string{{"role": "user", "content": prompt}},
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(reqBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", e.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("anthropic request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("anthropic error %d: %s", resp.StatusCode, body)
	}

	var result struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(body, &result); err != nil || len(result.Content) == 0 {
		return nil, fmt.Errorf("parse anthropic response: %w", err)
	}

	var rawSignals []struct {
		SignalType      string  `json:"signal_type"`
		Text            string  `json:"text"`
		NormalizedValue string  `json:"normalized_value"`
		Weight          float64 `json:"weight"`
	}
	if err := json.Unmarshal([]byte(result.Content[0].Text), &rawSignals); err != nil {
		// Fallback to rule-based if LLM output is unparseable
		rb := &RuleBasedExtractor{}
		return rb.ExtractSignals(ctx, text)
	}

	var signals []domain.MemorySignal
	for _, rs := range rawSignals {
		signals = append(signals, domain.MemorySignal{
			ID:              uuid.New().String(),
			SignalType:      rs.SignalType,
			Text:            rs.Text,
			NormalizedValue: rs.NormalizedValue,
			Weight:          rs.Weight,
			Confidence:      rs.Weight,
		})
	}
	return signals, nil
}
