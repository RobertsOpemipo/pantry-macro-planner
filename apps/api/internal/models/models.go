package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	FullName     string    `json:"full_name"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type AuthCredentials struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Food struct {
	ID              uuid.UUID `json:"id"`
	Barcode         *string   `json:"barcode,omitempty"`
	Name            string    `json:"name" binding:"required"`
	Brand           *string   `json:"brand,omitempty"`
	CaloriesPer100g float64   `json:"calories_per_100g"`
	ProteinPer100g  float64   `json:"protein_per_100g"`
	CarbsPer100g    float64   `json:"carbs_per_100g"`
	FatPer100g      float64   `json:"fat_per_100g"`
	ServingUnit     string    `json:"serving_unit"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateFoodInput struct {
	Barcode         *string `json:"barcode"`
	Name            string  `json:"name" binding:"required"`
	Brand           *string `json:"brand"`
	CaloriesPer100g float64 `json:"calories_per_100g"`
	ProteinPer100g  float64 `json:"protein_per_100g"`
	CarbsPer100g    float64 `json:"carbs_per_100g"`
	FatPer100g      float64 `json:"fat_per_100g"`
	ServingUnit     string  `json:"serving_unit"`
}

type PantryItem struct {
	ID                uuid.UUID  `json:"id"`
	UserID            uuid.UUID  `json:"user_id"`
	FoodID            uuid.UUID  `json:"food_id"`
	Food              *Food      `json:"food,omitempty"`
	QuantityRemaining float64    `json:"quantity_remaining"`
	Unit              string     `json:"unit"`
	PurchaseDate      time.Time  `json:"purchase_date"`
	ExpirationDate    *time.Time `json:"expiration_date,omitempty"`
	LowStockThreshold float64    `json:"low_stock_threshold"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type AddPantryItemInput struct {
	FoodID            uuid.UUID  `json:"food_id" binding:"required"`
	QuantityRemaining float64    `json:"quantity_remaining" binding:"required"`
	Unit              string     `json:"unit"`
	ExpirationDate    *time.Time `json:"expiration_date"`
	LowStockThreshold float64    `json:"low_stock_threshold"`
}

type RecipeIngredientInput struct {
	FoodID uuid.UUID `json:"food_id" binding:"required"`
	Amount float64   `json:"amount" binding:"required,gt=0"`
	Unit   string    `json:"unit"`
}

type CreateRecipeInput struct {
	Title        string                  `json:"title" binding:"required"`
	Servings     int                     `json:"servings" binding:"required,min=1"`
	Instructions string                  `json:"instructions"`
	Ingredients  []RecipeIngredientInput `json:"ingredients" binding:"required,min=1"`
}

type RecipeIngredientDetail struct {
	ID       uuid.UUID `json:"id"`
	FoodID   uuid.UUID `json:"food_id"`
	FoodName string    `json:"food_name"`
	Amount   float64   `json:"amount"`
	Unit     string    `json:"unit"`
	Calories float64   `json:"calories"`
	Protein  float64   `json:"protein"`
	Carbs    float64   `json:"carbs"`
	Fat      float64   `json:"fat"`
}

type RecipeMacros struct {
	TotalCalories    float64 `json:"total_calories"`
	TotalProtein     float64 `json:"total_protein"`
	TotalCarbs       float64 `json:"total_carbs"`
	TotalFat         float64 `json:"total_fat"`
	CaloriesPerServe float64 `json:"calories_per_serving"`
	ProteinPerServe  float64 `json:"protein_per_serving"`
	CarbsPerServe    float64 `json:"carbs_per_serving"`
	FatPerServe      float64 `json:"fat_per_serving"`
}

type RecipeDetail struct {
	ID           uuid.UUID                `json:"id"`
	UserID       uuid.UUID                `json:"user_id"`
	Title        string                   `json:"title"`
	Servings     int                      `json:"servings"`
	Instructions string                   `json:"instructions"`
	Ingredients  []RecipeIngredientDetail `json:"ingredients"`
	Macros       RecipeMacros             `json:"macros"`
	CreatedAt    time.Time                `json:"created_at"`
	UpdatedAt    time.Time                `json:"updated_at"`
}

type CookBatchInput struct {
	BatchesCooked int `json:"batches_cooked" binding:"required,min=1"`
}
type MealDecompositionRequest struct {
	ImageBase64 string `json:"image_base64" binding:"required"`
}

type MealComponent struct {
	FoodName       string  `json:"food_name"`
	EstimatedGrams float64 `json:"estimated_grams"`
	Confidence     float64 `json:"confidence"`
	Category       string  `json:"category"` // "rice", "swallow", "soup_stew", "protein", "side"
}

type MealDecompositionResponse struct {
	Mode       string          `json:"mode"` // "online_ai" or "fallback_heuristic"
	Components []MealComponent `json:"components"`
	Note       string          `json:"note"`
}
