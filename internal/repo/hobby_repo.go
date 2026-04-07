package repo

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"hobby-map/internal/domain"
)

type ScoredID struct {
	ID    string
	Score float64
}

type ListFilter struct {
	StartupCostMax      *float64
	OngoingCostMax      *float64
	TimePerSessionMax   *float64
	PhysicalDemandMax   *float64
	SpaceRequiredMax    *float64
	SocialDependencyMax *float64
	Limit               int
	Offset              int
}

type HobbyRepo struct {
	db *sql.DB
}

func NewHobbyRepo(db *sql.DB) *HobbyRepo {
	return &HobbyRepo{db: db}
}

func (r *HobbyRepo) GetByID(ctx context.Context, id string) (*domain.Hobby, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT n.id, n.slug, n.name, COALESCE(n.name_zh, ''), h.short_desc, h.long_desc, h.difficulty_summary, h.starter_path, h.popularity
		FROM nodes n JOIN hobbies h ON h.node_id = n.id
		WHERE n.id = ?`, id)

	var h domain.Hobby
	err := row.Scan(&h.ID, &h.Slug, &h.Name, &h.NameZH, &h.ShortDesc, &h.LongDesc, &h.DifficultySummary, &h.StarterPath, &h.Popularity)
	if err != nil {
		return nil, fmt.Errorf("hobby %s not found: %w", id, err)
	}

	h.Dimensions, err = r.getDimensions(ctx, id)
	if err != nil {
		return nil, err
	}

	h.Aliases, err = r.getAliases(ctx, id)
	if err != nil {
		return nil, err
	}

	return &h, nil
}

func (r *HobbyRepo) List(ctx context.Context, f ListFilter) ([]domain.Hobby, error) {
	if f.Limit == 0 {
		f.Limit = 50
	}

	var where []string
	var args []any

	addDimFilter := func(dimID string, maxVal *float64) {
		if maxVal == nil {
			return
		}
		where = append(where, fmt.Sprintf(`n.id NOT IN (
			SELECT hobby_id FROM hobby_dimensions WHERE dimension_id = ? AND value > ?
		)`))
		args = append(args, dimID, *maxVal)
	}

	addDimFilter("d_startup_cost", f.StartupCostMax)
	addDimFilter("d_ongoing_cost", f.OngoingCostMax)
	addDimFilter("d_time_per_session", f.TimePerSessionMax)
	addDimFilter("d_physical_demand", f.PhysicalDemandMax)
	addDimFilter("d_space_required", f.SpaceRequiredMax)
	addDimFilter("d_social_dependency", f.SocialDependencyMax)

	query := `SELECT n.id, n.slug, n.name, COALESCE(n.name_zh, ''), h.short_desc, h.long_desc, h.difficulty_summary, h.starter_path, h.popularity
		FROM nodes n JOIN hobbies h ON h.node_id = n.id WHERE n.node_type = 'hobby'`

	if len(where) > 0 {
		query += " AND " + strings.Join(where, " AND ")
	}
	query += " ORDER BY h.popularity DESC LIMIT ? OFFSET ?"
	args = append(args, f.Limit, f.Offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list hobbies: %w", err)
	}

	// Collect rows first, then close — avoids holding the connection while
	// loading dimensions/aliases (which need their own queries).
	var hobbies []domain.Hobby
	for rows.Next() {
		var h domain.Hobby
		if err := rows.Scan(&h.ID, &h.Slug, &h.Name, &h.NameZH, &h.ShortDesc, &h.LongDesc, &h.DifficultySummary, &h.StarterPath, &h.Popularity); err != nil {
			rows.Close()
			return nil, err
		}
		hobbies = append(hobbies, h)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, err
	}
	rows.Close()

	for i := range hobbies {
		hobbies[i].Dimensions, _ = r.getDimensions(ctx, hobbies[i].ID)
		hobbies[i].Aliases, _ = r.getAliases(ctx, hobbies[i].ID)
	}
	return hobbies, nil
}

func (r *HobbyRepo) SearchFTS(ctx context.Context, query string, limit int) ([]ScoredID, error) {
	return r.searchFTS(ctx, buildFTSQuery([]string{query}), limit)
}

func (r *HobbyRepo) SearchFTSClauses(ctx context.Context, clauses []string, limit int) ([]ScoredID, error) {
	return r.searchFTS(ctx, buildFTSQuery(clauses), limit)
}

func (r *HobbyRepo) searchFTS(ctx context.Context, query string, limit int) ([]ScoredID, error) {
	if limit == 0 {
		limit = 20
	}
	if query == "" {
		return nil, nil
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT node_id, rank FROM hobby_fts WHERE hobby_fts MATCH ? ORDER BY rank LIMIT ?
	`, query, limit)
	if err != nil {
		return nil, fmt.Errorf("fts search: %w", err)
	}
	defer rows.Close()

	var results []ScoredID
	for rows.Next() {
		var s ScoredID
		if err := rows.Scan(&s.ID, &s.Score); err != nil {
			return nil, err
		}
		results = append(results, s)
	}
	return results, rows.Err()
}

func (r *HobbyRepo) getDimensions(ctx context.Context, hobbyID string) (map[string]float64, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT d.key, hd.value FROM hobby_dimensions hd
		JOIN dimensions d ON d.id = hd.dimension_id
		WHERE hd.hobby_id = ?`, hobbyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	dims := make(map[string]float64)
	for rows.Next() {
		var key string
		var val float64
		rows.Scan(&key, &val)
		dims[key] = val
	}
	return dims, rows.Err()
}

func (r *HobbyRepo) getAliases(ctx context.Context, hobbyID string) ([]string, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT alias FROM hobby_aliases WHERE hobby_id = ?", hobbyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var aliases []string
	for rows.Next() {
		var a string
		rows.Scan(&a)
		aliases = append(aliases, a)
	}
	return aliases, rows.Err()
}
