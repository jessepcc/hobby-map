package app

import "os"

type Config struct {
	DBPath            string
	Port              string
	LLMProvider       string
	LLMAPIKey         string
	EmbeddingProvider string
	EmbeddingAPIKey   string
	SeedsDir          string
}

func LoadConfig() Config {
	return Config{
		DBPath:            envOr("DB_PATH", "hobby-map.db"),
		Port:              envOr("PORT", "8080"),
		LLMProvider:       envOr("LLM_PROVIDER", "anthropic"),
		LLMAPIKey:         os.Getenv("LLM_API_KEY"),
		EmbeddingProvider: envOr("EMBEDDING_PROVIDER", "openai"),
		EmbeddingAPIKey:   os.Getenv("EMBEDDING_API_KEY"),
		SeedsDir:          envOr("SEEDS_DIR", "seeds"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
