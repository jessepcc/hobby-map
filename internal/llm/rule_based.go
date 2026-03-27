package llm

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"hobby-map/internal/domain"
)

// RuleBasedExtractor is a simple keyword-based extractor for use without an LLM API key.
type RuleBasedExtractor struct{}

func (e *RuleBasedExtractor) ExtractSignals(_ context.Context, text string) ([]domain.MemorySignal, error) {
	lower := strings.ToLower(text)
	var signals []domain.MemorySignal

	// Interest detection: find noun phrases after interest keywords
	interestKeywords := []string{"interested in", "love", "enjoy", "fascinated by", "passionate about", "like"}
	for _, kw := range interestKeywords {
		idx := strings.Index(lower, kw)
		if idx >= 0 {
			after := strings.TrimSpace(text[idx+len(kw):])
			phrase := extractPhrase(after)
			if phrase != "" {
				signals = append(signals, domain.MemorySignal{
					ID:              uuid.New().String(),
					SignalType:      "interest",
					Text:            phrase,
					NormalizedValue: normalize(phrase),
					Weight:          0.85,
					Confidence:      0.7,
				})
			}
		}
	}

	// Constraint detection
	constraintMap := map[string]string{
		"low cost":       "low_cost",
		"cheap":          "low_cost",
		"budget":         "low_cost",
		"affordable":     "low_cost",
		"not much time":  "low_time",
		"limited time":   "low_time",
		"short sessions": "low_time",
		"solo":           "solo_friendly",
		"alone":          "solo_friendly",
		"by myself":      "solo_friendly",
		"not physical":   "low_physical",
		"low physical":   "low_physical",
		"small space":    "low_space",
		"apartment":      "low_space",
		"creative":       "high_creative",
		"artistic":       "high_creative",
		"long-term":      "high_longevity",
		"lifetime":       "high_longevity",
		"travel":         "portable",
		"portable":       "portable",
	}

	for phrase, normalized := range constraintMap {
		if strings.Contains(lower, phrase) {
			signals = append(signals, domain.MemorySignal{
				ID:              uuid.New().String(),
				SignalType:      "lifestyle_constraint",
				Text:            phrase,
				NormalizedValue: normalized,
				Weight:          0.75,
				Confidence:      0.6,
			})
		}
	}

	// Goal detection
	goalKeywords := map[string]string{
		"meaningful":  "meaningful_hobby",
		"progress":    "sense_of_progress",
		"mastery":     "mastery",
		"relaxing":    "relaxation",
		"calm":        "relaxation",
		"social":      "social_connection",
		"community":   "social_connection",
		"identity":    "identity",
		"proud":       "achievement",
		"achievement": "achievement",
		"disciplined": "disciplined_practice",
		"discipline":  "disciplined_practice",
	}

	for keyword, normalized := range goalKeywords {
		if strings.Contains(lower, keyword) {
			signals = append(signals, domain.MemorySignal{
				ID:              uuid.New().String(),
				SignalType:      "desired_experience",
				Text:            keyword,
				NormalizedValue: normalized,
				Weight:          0.8,
				Confidence:      0.65,
			})
		}
	}

	// If no signals extracted, treat entire text as interest
	if len(signals) == 0 {
		signals = append(signals, domain.MemorySignal{
			ID:              uuid.New().String(),
			SignalType:      "interest",
			Text:            strings.TrimSpace(text),
			NormalizedValue: normalize(text),
			Weight:          0.7,
			Confidence:      0.5,
		})
	}

	return signals, nil
}

func extractPhrase(s string) string {
	// Take up to first punctuation or conjunction
	for i, c := range s {
		if c == ',' || c == '.' || c == ';' || c == '\n' {
			return strings.TrimSpace(s[:i])
		}
		if i > 60 {
			return strings.TrimSpace(s[:i])
		}
	}
	return strings.TrimSpace(s)
}

func normalize(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.ReplaceAll(s, " ", "_")
	s = strings.ReplaceAll(s, "-", "_")
	return s
}
