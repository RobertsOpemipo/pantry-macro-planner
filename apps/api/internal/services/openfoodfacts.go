package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"pantry-macro-api/internal/models"
)

type OpenFoodFactsService struct {
	client *http.Client
}

func NewOpenFoodFactsService() *OpenFoodFactsService {
	return &OpenFoodFactsService{
		client: &http.Client{
			Timeout: 6 * time.Second,
		},
	}
}

// Open Food Facts API v2 response schema
type offResponse struct {
	Status int `json:"status"`
	Product struct {
		ProductName string `json:"product_name"`
		Brands      string `json:"brands"`
		Nutriments  struct {
			EnergyKcal100g *float64 `json:"energy-kcal_100g"`
			EnergyKcal     *float64 `json:"energy-kcal"`
			Proteins100g   *float64 `json:"proteins_100g"`
			Carbs100g      *float64 `json:"carbohydrates_100g"`
			Fat100g        *float64 `json:"fat_100g"`
		} `json:"nutriments"`
	} `json:"product"`
}

func (s *OpenFoodFactsService) FetchByBarcode(barcode string) (*models.CreateFoodInput, error) {
	url := fmt.Sprintf("https://world.openfoodfacts.org/api/v2/product/%s.json", barcode)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	// Open Food Facts requires a descriptive User-Agent
	req.Header.Set("User-Agent", "PantryMacroPlanner/1.0 (contact@pantryplanner.local)")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to reach Open Food Facts API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var offResp offResponse
	if err := json.NewDecoder(resp.Body).Decode(&offResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if offResp.Status != 1 || offResp.Product.ProductName == "" {
		return nil, nil
	}

	// Parse calories (fallback from energy-kcal)
	var calories float64
	if offResp.Product.Nutriments.EnergyKcal100g != nil {
		calories = *offResp.Product.Nutriments.EnergyKcal100g
	} else if offResp.Product.Nutriments.EnergyKcal != nil {
		calories = *offResp.Product.Nutriments.EnergyKcal
	}

	var protein, carbs, fat float64
	if offResp.Product.Nutriments.Proteins100g != nil {
		protein = *offResp.Product.Nutriments.Proteins100g
	}
	if offResp.Product.Nutriments.Carbs100g != nil {
		carbs = *offResp.Product.Nutriments.Carbs100g
	}
	if offResp.Product.Nutriments.Fat100g != nil {
		fat = *offResp.Product.Nutriments.Fat100g
	}

	brand := offResp.Product.Brands
	return &models.CreateFoodInput{
		Barcode:         &barcode,
		Name:            offResp.Product.ProductName,
		Brand:           &brand,
		CaloriesPer100g: calories,
		ProteinPer100g:  protein,
		CarbsPer100g:    carbs,
		FatPer100g:      fat,
		ServingUnit:     "g",
	}, nil
}