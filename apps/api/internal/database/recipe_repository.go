package database

import (
	"context"
	"fmt"
	"math"
	"pantry-macro-api/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type RecipeRepository struct {
	db *pgxpool.Pool
}

func NewRecipeRepository(db *pgxpool.Pool) *RecipeRepository {
	return &RecipeRepository{db: db}
}

func (r *RecipeRepository) CreateRecipe(ctx context.Context, userID uuid.UUID, input models.CreateRecipeInput) (*models.RecipeDetail, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Insert Recipe
	var recipeID uuid.UUID
	queryRecipe := `
		INSERT INTO recipes (user_id, title, servings, instructions)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	if err := tx.QueryRow(ctx, queryRecipe, userID, input.Title, input.Servings, input.Instructions).Scan(&recipeID); err != nil {
		return nil, err
	}

	// 2. Insert Ingredients
	queryIngredient := `
		INSERT INTO recipe_ingredients (recipe_id, food_id, amount, unit)
		VALUES ($1, $2, $3, COALESCE(NULLIF($4, ''), 'g'))
	`
	for _, ing := range input.Ingredients {
		if _, err := tx.Exec(ctx, queryIngredient, recipeID, ing.FoodID, ing.Amount, ing.Unit); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return r.GetRecipeByID(ctx, userID, recipeID)
}

func (r *RecipeRepository) GetRecipeByID(ctx context.Context, userID, recipeID uuid.UUID) (*models.RecipeDetail, error) {
	query := `
		SELECT r.id, r.user_id, r.title, r.servings, r.instructions, r.created_at, r.updated_at,
		       ri.id, ri.food_id, f.name, ri.amount, ri.unit,
		       f.calories_per_100g, f.protein_per_100g, f.carbs_per_100g, f.fat_per_100g
		FROM recipes r
		JOIN recipe_ingredients ri ON r.id = ri.recipe_id
		JOIN foods f ON ri.food_id = f.id
		WHERE r.id = $1 AND r.user_id = $2
	`
	rows, err := r.db.Query(ctx, query, recipeID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var detail models.RecipeDetail
	var ingredients []models.RecipeIngredientDetail
	var totalCals, totalProt, totalCarb, totalFat float64

	for rows.Next() {
		var ing models.RecipeIngredientDetail
		var c100, p100, cb100, f100 float64

		if err := rows.Scan(
			&detail.ID, &detail.UserID, &detail.Title, &detail.Servings, &detail.Instructions, &detail.CreatedAt, &detail.UpdatedAt,
			&ing.ID, &ing.FoodID, &ing.FoodName, &ing.Amount, &ing.Unit,
			&c100, &p100, &cb100, &f100,
		); err != nil {
			return nil, err
		}

		// Calculate scaled macros for ingredient
		scale := ing.Amount / 100.0
		ing.Calories = math.Round(c100*scale*10) / 10
		ing.Protein = math.Round(p100*scale*10) / 10
		ing.Carbs = math.Round(cb100*scale*10) / 10
		ing.Fat = math.Round(f100*scale*10) / 10

		totalCals += ing.Calories
		totalProt += ing.Protein
		totalCarb += ing.Carbs
		totalFat += ing.Fat

		ingredients = append(ingredients, ing)
	}

	if len(ingredients) == 0 {
		return nil, nil
	}

	detail.Ingredients = ingredients
	detail.Macros = models.RecipeMacros{
		TotalCalories:    math.Round(totalCals*10) / 10,
		TotalProtein:     math.Round(totalProt*10) / 10,
		TotalCarbs:       math.Round(totalCarb*10) / 10,
		TotalFat:         math.Round(totalFat*10) / 10,
		CaloriesPerServe: math.Round((totalCals/float64(detail.Servings))*10) / 10,
		ProteinPerServe:  math.Round((totalProt/float64(detail.Servings))*10) / 10,
		CarbsPerServe:    math.Round((totalCarb/float64(detail.Servings))*10) / 10,
		FatPerServe:      math.Round((totalFat/float64(detail.Servings))*10) / 10,
	}

	return &detail, nil
}

// DeductIngredientsForBatch executes an atomic transaction reducing stock across pantry items
func (r *RecipeRepository) DeductIngredientsForBatch(ctx context.Context, userID, recipeID uuid.UUID, batches int) error {
	recipe, err := r.GetRecipeByID(ctx, userID, recipeID)
	if err != nil || recipe == nil {
		return fmt.Errorf("recipe not found")
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, ing := range recipe.Ingredients {
		totalNeeded := ing.Amount * float64(batches)

		// Deduct from earliest expiring pantry item first
		updateQuery := `
			UPDATE pantry_items 
			SET quantity_remaining = GREATEST(0, quantity_remaining - $1), updated_at = NOW()
			WHERE id = (
				SELECT id FROM pantry_items 
				WHERE user_id = $2 AND food_id = $3 
				ORDER BY expiration_date ASC NULLS LAST, created_at ASC 
				LIMIT 1
			)
		`
		res, err := tx.Exec(ctx, updateQuery, totalNeeded, userID, ing.FoodID)
		if err != nil {
			return err
		}
		if res.RowsAffected() == 0 {
			return fmt.Errorf("ingredient '%s' is missing in your pantry inventory", ing.FoodName)
		}
	}

	return tx.Commit(ctx)
}