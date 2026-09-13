package database

import (
	"context"
	"pantry-macro-api/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PantryRepository struct {
	db *pgxpool.Pool
}

func NewPantryRepository(db *pgxpool.Pool) *PantryRepository {
	return &PantryRepository{db: db}
}

func (r *PantryRepository) AddItem(ctx context.Context, userID uuid.UUID, input models.AddPantryItemInput) (*models.PantryItem, error) {
	query := `
		INSERT INTO pantry_items (user_id, food_id, quantity_remaining, unit, expiration_date, low_stock_threshold)
		VALUES ($1, $2, $3, COALESCE(NULLIF($4, ''), 'g'), $5, COALESCE($6, 200))
		RETURNING id, user_id, food_id, quantity_remaining, unit, purchase_date, expiration_date, low_stock_threshold, created_at, updated_at
	`
	var item models.PantryItem
	err := r.db.QueryRow(ctx, query,
		userID, input.FoodID, input.QuantityRemaining, input.Unit, input.ExpirationDate, input.LowStockThreshold,
	).Scan(
		&item.ID, &item.UserID, &item.FoodID, &item.QuantityRemaining, &item.Unit,
		&item.PurchaseDate, &item.ExpirationDate, &item.LowStockThreshold,
		&item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *PantryRepository) ListAll(ctx context.Context, userID uuid.UUID) ([]models.PantryItem, error) {
	query := `
		SELECT 
			p.id, p.user_id, p.food_id, p.quantity_remaining, p.unit, p.purchase_date, p.expiration_date, p.low_stock_threshold, p.created_at, p.updated_at,
			f.id, f.barcode, f.name, f.brand, f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g, f.serving_unit
		FROM pantry_items p
		JOIN foods f ON p.food_id = f.id
		WHERE p.user_id = $1
		ORDER BY p.expiration_date ASC NULLS LAST, p.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.PantryItem
	for rows.Next() {
		var item models.PantryItem
		var food models.Food
		if err := rows.Scan(
			&item.ID, &item.UserID, &item.FoodID, &item.QuantityRemaining, &item.Unit,
			&item.PurchaseDate, &item.ExpirationDate, &item.LowStockThreshold,
			&item.CreatedAt, &item.UpdatedAt,
			&food.ID, &food.Barcode, &food.Name, &food.Brand,
			&food.CaloriesPer100g, &food.ProteinPer100g, &food.CarbsPer100g, &food.FatPer100g, &food.ServingUnit,
		); err != nil {
			return nil, err
		}
		item.Food = &food
		items = append(items, item)
	}
	return items, nil
}

func (r *PantryRepository) UpdateQuantity(ctx context.Context, userID, id uuid.UUID, newQuantity float64) error {
	query := `UPDATE pantry_items SET quantity_remaining = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`
	_, err := r.db.Exec(ctx, query, newQuantity, id, userID)
	return err
}

func (r *PantryRepository) Delete(ctx context.Context, userID, id uuid.UUID) error {
	query := `DELETE FROM pantry_items WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, id, userID)
	return err
}
