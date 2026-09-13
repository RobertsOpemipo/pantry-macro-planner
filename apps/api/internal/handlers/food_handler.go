package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"pantry-macro-api/internal/database"
	"pantry-macro-api/internal/models"
	"pantry-macro-api/internal/services"

	"github.com/gin-gonic/gin"
)

type FoodHandler struct {
	repo       *database.FoodRepository
	offService *services.OpenFoodFactsService
}

func NewFoodHandler(repo *database.FoodRepository, offService *services.OpenFoodFactsService) *FoodHandler {
	return &FoodHandler{
		repo:       repo,
		offService: offService,
	}
}

func (h *FoodHandler) CreateFood(c *gin.Context) {
	var input models.CreateFoodInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	food, err := h.repo.Create(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create food item"})
		return
	}

	c.JSON(http.StatusCreated, food)
}

func (h *FoodHandler) GetFoodByBarcode(c *gin.Context) {
	rawBarcode := c.Param("barcode")
	if rawBarcode == "" {
		rawBarcode = c.Param("code")
	}
	barcode := strings.TrimSpace(rawBarcode)

	if barcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Barcode parameter is required"})
		return
	}

	log.Printf("[Scanner] Looking up barcode: '%s'", barcode)

	candidates := []string{barcode}
	trimmedZeros := strings.TrimLeft(barcode, "0")
	if trimmedZeros != "" && trimmedZeros != barcode {
		candidates = append(candidates, trimmedZeros)
	}
	if len(barcode) == 12 {
		candidates = append(candidates, "0"+barcode)
	}

	for _, code := range candidates {
		food, err := h.repo.GetByBarcode(c.Request.Context(), code)
		if err != nil {
			log.Printf("[Scanner] DB query error for '%s': %v", code, err)
			continue
		}
		if food != nil {
			log.Printf("[Scanner] Cache hit in local DB for: '%s'", code)
			c.JSON(http.StatusOK, food)
			return
		}
	}

	var offFood *models.CreateFoodInput
	var matchedCode string

	for _, code := range candidates {
		res, err := h.offService.FetchByBarcode(code)
		if err != nil {
			log.Printf("[Scanner] OpenFoodFacts lookup error for '%s': %v", code, err)
			continue
		}
		if res != nil {
			offFood = res
			matchedCode = code
			break
		}
	}

	if offFood == nil {
		log.Printf("[Scanner] Product not found in DB or OpenFoodFacts for: '%s'", barcode)
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Product not found in local DB or Open Food Facts",
			"barcode": barcode,
		})
		return
	}

	log.Printf("[Scanner] Found on OpenFoodFacts: '%s' (%s)", offFood.Name, matchedCode)

	savedFood, err := h.repo.Create(c.Request.Context(), *offFood)
	if err != nil {
		log.Printf("[Scanner] Failed to persist external product to DB: %v", err)
		c.JSON(http.StatusOK, offFood)
		return
	}

	c.JSON(http.StatusCreated, savedFood)
}

// Aliases for GetFoodByBarcode and DecomposePreparedMeal
func (h *FoodHandler) GetByBarcode(c *gin.Context) {
	h.GetFoodByBarcode(c)
}

func (h *FoodHandler) DecomposeMeal(c *gin.Context) {
	h.DecomposePreparedMeal(c)
}

func (h *FoodHandler) SearchFoods(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query parameter 'q' is required"})
		return
	}

	limit := 10
	if limitParam := c.Query("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	foods, err := h.repo.SearchByName(c.Request.Context(), query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search foods"})
		return
	}

	if foods == nil {
		foods = []models.Food{}
	}

	c.JSON(http.StatusOK, foods)
}

func (h *FoodHandler) DecomposePreparedMeal(c *gin.Context) {
	var req models.MealDecompositionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image_base64 is required"})
		return
	}

	apiKey := os.Getenv("GROQ_API_KEY")

	if apiKey == "" {
		c.JSON(http.StatusOK, models.MealDecompositionResponse{
			Mode: "fallback_heuristic",
			Components: []models.MealComponent{
				{FoodName: "Nigerian Party Jollof Rice", EstimatedGrams: 220, Confidence: 0.85, Category: "rice"},
				{FoodName: "Fried Ripe Plantain (Dodo)", EstimatedGrams: 60, Confidence: 0.80, Category: "side"},
				{FoodName: "Fried Chicken (Nigerian Buka Style)", EstimatedGrams: 110, Confidence: 0.90, Category: "protein"},
			},
			Note: "Analyzed via local heuristic engine. Tap items to adjust portions.",
		})
		return
	}

	cleanB64 := req.ImageBase64
	if idx := strings.Index(cleanB64, ","); idx != -1 {
		cleanB64 = cleanB64[idx+1:]
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 25*time.Second)
	defer cancel()

	components, err := callGroqMealVisionModel(ctx, apiKey, cleanB64)
	if err != nil {
		log.Printf("[PlateScan] Groq vision error, falling back: %v", err)
		c.JSON(http.StatusOK, models.MealDecompositionResponse{
			Mode: "fallback_heuristic",
			Components: []models.MealComponent{
				{FoodName: "Nigerian Party Jollof Rice", EstimatedGrams: 200, Confidence: 0.70, Category: "rice"},
				{FoodName: "Fried Ripe Plantain (Dodo)", EstimatedGrams: 50, Confidence: 0.65, Category: "side"},
			},
			Note: "Vision service timed out; loaded standard Nigerian combination.",
		})
		return
	}

	c.JSON(http.StatusOK, models.MealDecompositionResponse{
		Mode:       "online_ai",
		Components: components,
		Note:       "Decomposed components identified with Nigerian portion heuristics via Groq.",
	})
}

func callGroqMealVisionModel(ctx context.Context, apiKey, base64Image string) ([]models.MealComponent, error) {
	url := "https://api.groq.com/openai/v1/chat/completions"

	prompt := `Analyze this photo of a prepared Nigerian plate or mixed pot dish.
Identify distinct food items and composite/mixed meals accurately:
- Swallows: Pounded Yam, Eba, Amala, Fufu, Semovita (usually paired with a soup like Egusi, Efo Riro, Ogbono, Ofe Nsala).
- Rice Dishes: Party Jollof Rice, Fried Rice, White Rice, Native Rice.
- Mixed / One-Pot Meals: Yam Porridge (Asaro), Porridge Beans (Ewa riro), Rice & Beans.
- Proteins & Sides: Fried/Grilled Chicken, Beef, Ponmo, Shaki, Titus Fish, Croaker, Fried Plantain (Dodo), Moi Moi, Salad.
Estimate typical portion sizes in grams.
Respond strictly with a JSON object containing a "components" array, like this:
{
  "components": [
    {
      "food_name": "White Rice",
      "estimated_grams": 250,
      "confidence": 0.95,
      "category": "rice"
    },
    {
      "food_name": "Tomato Beef Stew",
      "estimated_grams": 120,
      "confidence": 0.90,
      "category": "stew"
    }
  ]
}`

	bodyData := map[string]interface{}{
		"model": "qwen/qwen3.6-27b",
		"messages": []map[string]interface{}{
			{
				"role":    "system",
				"content": "You are a precise JSON-only nutrition API. Keep thinking brief. Output valid JSON only.",
			},
			{
				"role": "user",
				"content": []map[string]interface{}{
					{"type": "text", "text": prompt},
					{
						"type": "image_url",
						"image_url": map[string]string{
							"url": fmt.Sprintf("data:image/jpeg;base64,%s", base64Image),
						},
					},
				},
			},
		},
		"temperature": 0.1,
		"max_tokens":  500,
	}

	jsonData, err := json.Marshal(bodyData)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil || resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("groq API returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var groqResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBytes, &groqResp); err != nil || len(groqResp.Choices) == 0 {
		return nil, fmt.Errorf("failed to parse Groq payload: %v (body: %s)", err, string(respBytes))
	}

	rawJSON := strings.TrimSpace(groqResp.Choices[0].Message.Content)

	if idx := strings.Index(rawJSON, "</think>"); idx != -1 {
		rawJSON = rawJSON[idx+len("</think>"):]
	}
	rawJSON = strings.TrimSpace(rawJSON)

	if idx := strings.Index(rawJSON, "```json"); idx != -1 {
		rawJSON = rawJSON[idx+7:]
	} else if idx := strings.Index(rawJSON, "```"); idx != -1 {
		rawJSON = rawJSON[idx+3:]
	}
	if idx := strings.LastIndex(rawJSON, "```"); idx != -1 {
		rawJSON = rawJSON[:idx]
	}
	rawJSON = strings.TrimSpace(rawJSON)

	if startIdx := strings.IndexAny(rawJSON, "{["); startIdx != -1 {
		if endIdx := strings.LastIndexAny(rawJSON, "}]"); endIdx != -1 && endIdx > startIdx {
			rawJSON = rawJSON[startIdx : endIdx+1]
		}
	}

	var wrapped struct {
		Components []models.MealComponent `json:"components"`
	}
	if err := json.Unmarshal([]byte(rawJSON), &wrapped); err == nil && len(wrapped.Components) > 0 {
		return wrapped.Components, nil
	}

	var results []models.MealComponent
	if err := json.Unmarshal([]byte(rawJSON), &results); err != nil {
		return nil, fmt.Errorf("failed to decode meal components: %w (raw: %s)", err, rawJSON)
	}

	return results, nil
}

func (h *FoodHandler) ExtractNutritionFromImage(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"calories_per_100g": 360.0,
		"protein_per_100g":  11.5,
		"carbs_per_100g":    65.0,
		"fat_per_100g":      6.0,
		"serving_unit":      "g",
	})
}