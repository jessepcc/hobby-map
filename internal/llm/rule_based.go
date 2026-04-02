package llm

import (
	"context"
	"strings"

	"github.com/google/uuid"

	"hobby-map/internal/domain"
)

// RuleBasedExtractor is a simple keyword-based extractor for use without an LLM API key.
type RuleBasedExtractor struct{}

// hobbyAliases maps patterns found in text to hobby names in the DB.
// Each key is a lowercase phrase to search for; the value is the canonical hobby name.
var hobbyAliases = map[string]string{
	// Direct hobby mentions
	"kendo":              "Kendo",
	"kenjutsu":           "Kenjutsu",
	"iaido":              "Iaido",
	"martial art":        "Martial Arts",
	"photography":        "Photography",
	"street photography": "Photography",
	"travel photography": "Travel Photography",
	"film photography":   "Film Photography",
	"astrophotography":   "Astrophotography",
	"macro photography":  "Macro Photography",
	"wildlife photography": "Wildlife Photography",
	"investing":          "Personal Finance",
	"investment":         "Personal Finance",
	"stocks":             "Personal Finance",
	"portfolio":          "Personal Finance",
	"crypto":             "Personal Finance",
	"robotics":           "Amateur Robotics",
	"coding":             "Coding",
	"programming":        "Coding",
	"web development":    "Web Development",
	"software":           "Coding",
	"3d printing":        "3D Printing",
	"blender 3d":         "3D Modeling",
	"3d modeling":        "3D Modeling",
	"stop motion":        "Stop Motion Animation",
	"calligraphy":        "Calligraphy",
	"shodo":              "Shodo",
	"woodworking":        "Woodworking",
	"cooking":            "Cooking",
	"baking":             "Baking",
	"gardening":          "Gardening",
	"hiking":             "Hiking",
	"cycling":            "Cycling",
	"running":            "Running",
	"swimming":           "Swimming",
	"yoga":               "Yoga",
	"meditation":         "Meditation",
	"chess":              "Chess",
	"guitar":             "Guitar",
	"piano":              "Piano",
	"drums":              "Drums",
	"ukulele":            "Ukulele",
	"violin":             "Violin",
	"singing":            "Singing",
	"painting":           "Oil Painting",
	"watercolor":         "Watercolor Painting",
	"drawing":            "Drawing",
	"sketching":          "Urban Sketching",
	"pottery":            "Pottery",
	"sculpting":          "Sculpting",
	"knitting":           "Knitting",
	"crocheting":         "Crocheting",
	"sewing":             "Sewing",
	"journaling":         "Journaling",
	"writing":            "Creative Writing",
	"blogging":           "Blogging",
	"podcasting":         "Podcasting",
	"filmmaking":         "Filmmaking",
	"video editing":      "Video Editing",
	"video game":         "Video Games",
	"gaming":             "Video Games",
	"board game":         "Board Games",
	"tabletop":           "Tabletop RPGs",
	"dnd":                "Tabletop RPGs",
	"d&d":                "Tabletop RPGs",
	"rock climbing":      "Rock Climbing",
	"bouldering":         "Bouldering",
	"surfing":            "Surfing",
	"skateboarding":      "Skateboarding",
	"skiing":             "Skiing",
	"snowboarding":       "Snowboarding",
	"camping":            "Camping",
	"backpacking":        "Backpacking",
	"fishing":            "Fishing",
	"archery":            "Archery",
	"fencing":            "Fencing",
	"boxing":             "Boxing",
	"kickboxing":         "Kickboxing",
	"tai chi":            "Tai Chi",
	"tea ceremony":       "Tea Ceremony",
	"origami":            "Origami",
	"ikebana":            "Ikebana",
	"bonsai":             "Bonsai",
	"aquarium":           "Aquarium Keeping",
	"drone":              "Drone Flying",
	"dj":                 "DJing",
	"music production":   "Music Production",
	"beatbox":            "Beatboxing",
	"magic":              "Card Magic",
	"juggling":           "Juggling",
	"cosplay":            "Cosplay",
	"lego":               "Lego Building",
	"puzzle":             "Puzzle Solving",
	"reading":            "Reading",
	"book club":          "Book Clubs",
	"astronomy":          "Astronomy",
	"stargazing":         "Stargazing",
	"birdwatch":          "Birdwatching",
	"homebrew":           "Homebrewing",
	"wine tasting":       "Wine Tasting",
	"coffee":             "Coffee Roasting",
	"ferment":            "Fermentation",
	"leatherwork":        "Leatherworking",
	"jewelry":            "Jewelry Making",
	"candle":             "Candle Making",
	"soap making":        "Soap Making",
	"mechanical keyboard": "Mechanical Keyboards",
	"vinyl":              "Vinyl Records",
	"coin collect":       "Coin Collecting",
	"stamp collect":      "Stamp Collecting",
	"fountain pen":       "Fountain Pens",
	"language learning":  "Language Learning",
	"language exchange":  "Language Exchange",
	"learning japanese":  "Language Learning",
	"learning chinese":   "Language Learning",
	"learning spanish":   "Language Learning",
	"learning french":    "Language Learning",
	"japanese language":  "Language Learning",
	"data visualization": "Data Visualization",
	"home automation":    "Home Automation",
	"ethical hacking":    "Ethical Hacking",
	"lock picking":       "Lock Picking",
	"laser cutting":      "Laser Cutting",
	"whittling":          "Whittling",
	"pen turning":        "Pen Turning",
	"glassblowing":       "Glassblowing",
	"blacksmithing":      "Blacksmithing",
	"philosophy":         "Philosophy",
	"neuroscience":       "Philosophy",
	"volunteer":          "Volunteering",
	"sailing":            "Sailing",
	"kayaking":           "Kayaking",
	"scuba":              "Scuba Diving",
	"tennis":             "Tennis",
	"badminton":          "Badminton",
	"table tennis":       "Table Tennis",
	"bowling":            "Bowling",
	"golf":               "Disc Golf",
	"parkour":            "Parkour",
	"slackline":          "Slacklining",
	"strength training":  "Weightlifting",
	"weightlifting":      "Weightlifting",
	"weight training":    "Weightlifting",
	"powerlifting":       "Weightlifting",
	"bodybuilding":       "Weightlifting",
	"calisthenics":       "Calisthenics",
	"ios development":    "Coding",
	"app development":    "Coding",
	"mobile development": "Coding",
	"hardware prototyping": "Electronics",
	"electronics":        "Electronics",
	"arduino":            "Electronics",
	"raspberry pi":       "Electronics",
	"ham radio":          "Ham Radio",
	"digital art":        "Digital Illustration",
	"illustration":       "Digital Illustration",
	"travel":             "Travel",
}

// activityVerbs are verbs that precede a hobby/activity in text
var activityVerbs = []string{
	"practices", "practice", "practises", "practise",
	"plays", "play", "playing",
	"does", "doing",
	"studies", "study", "studying",
	"learns", "learn", "learning",
	"teaches", "teach", "teaching",
	"trains", "train", "training",
	"enjoys", "enjoy", "enjoying",
	"loves", "love", "loving",
	"shoots", "shoot", "shooting",
	"builds", "build", "building",
	"makes", "make", "making",
	"collects", "collect", "collecting",
	"explored", "explores", "explore", "exploring",
	"started", "starts", "start", "starting",
	"into",
	"tried",
}

func (e *RuleBasedExtractor) ExtractSignals(_ context.Context, text string) ([]domain.MemorySignal, error) {
	lower := strings.ToLower(text)
	var signals []domain.MemorySignal
	seen := map[string]bool{}

	addSignal := func(signalType, text, normalized string, weight, confidence float64) {
		key := signalType + ":" + normalized
		if seen[key] {
			return
		}
		seen[key] = true
		signals = append(signals, domain.MemorySignal{
			ID:              uuid.New().String(),
			SignalType:      signalType,
			Text:            text,
			NormalizedValue: normalize(normalized),
			Weight:          weight,
			Confidence:      confidence,
		})
	}

	// 1. Direct hobby detection — match known hobbies/activities in the text
	for pattern, hobbyName := range hobbyAliases {
		if strings.Contains(lower, pattern) {
			addSignal("interest", hobbyName, hobbyName, 0.9, 0.85)
		}
	}

	// 2. Interest detection: find noun phrases after interest keywords
	interestKeywords := []string{"interested in", "interest in", "interests in", "interests spanning",
		"fascinated by", "passionate about", "curiosity about", "curious about"}
	for _, kw := range interestKeywords {
		idx := strings.Index(lower, kw)
		if idx >= 0 {
			after := strings.TrimSpace(text[idx+len(kw):])
			phrases := extractList(after)
			for _, phrase := range phrases {
				addSignal("interest", phrase, phrase, 0.85, 0.7)
			}
		}
	}

	// 3. Experience detection: find phrases after activity verbs
	for _, verb := range activityVerbs {
		searchStr := verb + " "
		idx := 0
		for {
			pos := strings.Index(lower[idx:], searchStr)
			if pos < 0 {
				break
			}
			absPos := idx + pos
			after := strings.TrimSpace(text[absPos+len(searchStr):])
			phrase := extractPhrase(after)
			if phrase != "" && len(phrase) > 2 {
				addSignal("experience", phrase, phrase, 0.85, 0.75)
			}
			idx = absPos + len(searchStr)
		}
	}

	// 4. Constraint detection
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
		"outdoor":        "outdoor",
		"indoor":         "indoor",
	}

	for phrase, normalized := range constraintMap {
		if strings.Contains(lower, phrase) {
			addSignal("lifestyle_constraint", phrase, normalized, 0.75, 0.6)
		}
	}

	// 5. Goal/experience detection
	goalKeywords := map[string]string{
		"meaningful":    "meaningful_hobby",
		"progress":      "sense_of_progress",
		"mastery":       "mastery",
		"relaxing":      "relaxation",
		"calm":          "relaxation",
		"social":        "social_connection",
		"community":     "social_connection",
		"identity":      "identity",
		"proud":         "achievement",
		"achievement":   "achievement",
		"competition":   "competition",
		"compete":       "competition",
		"disciplined":   "disciplined_practice",
		"discipline":    "disciplined_practice",
		"focus":         "focus",
		"mindful":       "mindfulness",
		"flow state":    "flow",
		"challenge":     "challenge",
		"intellectual":  "intellectual",
		"problem-solv":  "problem_solving",
		"hands-on":      "hands_on",
		"tactile":       "hands_on",
		"hardware":      "hands_on",
		"content creation": "content_creation",
	}

	for keyword, normalized := range goalKeywords {
		if strings.Contains(lower, keyword) {
			addSignal("desired_experience", keyword, normalized, 0.8, 0.65)
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

// extractList splits a comma/and-separated list of items from text
func extractList(s string) []string {
	// Take text up to first sentence boundary
	end := len(s)
	for i, c := range s {
		if c == '.' || c == ';' || c == '\n' {
			end = i
			break
		}
		if i > 120 {
			end = i
			break
		}
	}
	chunk := strings.TrimSpace(s[:end])

	// Split on comma or " and "
	parts := strings.Split(chunk, ",")
	var results []string
	for _, p := range parts {
		// Also split on " and "
		subParts := strings.Split(p, " and ")
		for _, sp := range subParts {
			sp = strings.TrimSpace(sp)
			if sp != "" && len(sp) > 2 {
				results = append(results, sp)
			}
		}
	}
	return results
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
