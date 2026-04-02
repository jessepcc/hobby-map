package repo

import (
	"strings"
	"unicode"
)

func buildFTSQuery(clauses []string) string {
	built := make([]string, 0, len(clauses))
	seen := make(map[string]struct{}, len(clauses))

	for _, clause := range clauses {
		quoted := quoteFTSPhrase(clause)
		if quoted == "" {
			continue
		}
		if _, ok := seen[quoted]; ok {
			continue
		}
		seen[quoted] = struct{}{}
		built = append(built, quoted)
	}

	return strings.Join(built, " OR ")
}

func quoteFTSPhrase(raw string) string {
	normalized := normalizeFTSText(raw)
	if normalized == "" {
		return ""
	}
	return `"` + strings.ReplaceAll(normalized, `"`, `""`) + `"`
}

func normalizeFTSText(raw string) string {
	var b strings.Builder
	b.Grow(len(raw))

	lastWasSpace := true
	for _, r := range raw {
		switch {
		case unicode.IsLetter(r) || unicode.IsNumber(r):
			b.WriteRune(unicode.ToLower(r))
			lastWasSpace = false
		case unicode.IsSpace(r):
			if !lastWasSpace {
				b.WriteByte(' ')
				lastWasSpace = true
			}
		default:
			if !lastWasSpace {
				b.WriteByte(' ')
				lastWasSpace = true
			}
		}
	}

	return strings.TrimSpace(b.String())
}
