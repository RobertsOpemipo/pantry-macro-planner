package database

import (
	"context"
	"errors"
	"pantry-macro-api/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FoodRepository struct {
	db *pgxpool.Pool
}

func NewFoodRepository(db *pgxpool.Pool) *FoodRepository {
	return &FoodRepository{db: db}
}

func (r *FoodRepository) Create(ctx context.Context, input models.CreateFoodInput) (*models.Food, error) {
	query := `
		INSERT INTO foods (barcode, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_unit)
		VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE(NULLIF($8, ''), 'g'))
		RETURNING id, barcode, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_unit, created_at, updated_at
	`
	var food models.Food
	err := r.db.QueryRow(ctx, query,
		input.Barcode, input.Name, input.Brand,
		input.CaloriesPer100g, input.ProteinPer100g, input.CarbsPer100g, input.FatPer100g,
		input.ServingUnit,
	).Scan(
		&food.ID, &food.Barcode, &food.Name, &food.Brand,
		&food.CaloriesPer100g, &food.ProteinPer100g, &food.CarbsPer100g, &food.FatPer100g,
		&food.ServingUnit, &food.CreatedAt, &food.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &food, nil
}

func (r *FoodRepository) GetByBarcode(ctx context.Context, barcode string) (*models.Food, error) {
	query := `
		SELECT id, barcode, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_unit, created_at, updated_at
		FROM foods
		WHERE barcode = $1
	`
	var food models.Food
	err := r.db.QueryRow(ctx, query, barcode).Scan(
		&food.ID, &food.Barcode, &food.Name, &food.Brand,
		&food.CaloriesPer100g, &food.ProteinPer100g, &food.CarbsPer100g, &food.FatPer100g,
		&food.ServingUnit, &food.CreatedAt, &food.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &food, nil
}

func (r *FoodRepository) SearchByName(ctx context.Context, term string, limit int) ([]models.Food, error) {
	query := `
		SELECT id, barcode, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, serving_unit, created_at, updated_at
		FROM foods
		WHERE name ILIKE '%' || $1 || '%'
		ORDER BY name ASC
		LIMIT $2
	`
	rows, err := r.db.Query(ctx, query, term, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var foods []models.Food
	for rows.Next() {
		var food models.Food
		if err := rows.Scan(
			&food.ID, &food.Barcode, &food.Name, &food.Brand,
			&food.CaloriesPer100g, &food.ProteinPer100g, &food.CarbsPer100g, &food.FatPer100g,
			&food.ServingUnit, &food.CreatedAt, &food.UpdatedAt,
		); err != nil {
			return nil, err
		}
		foods = append(foods, food)
	}
	return foods, nil
}
