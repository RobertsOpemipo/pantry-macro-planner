package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"

	"pantry-macro-api/internal/database"
	"pantry-macro-api/internal/handlers"
	"pantry-macro-api/internal/middleware"
	"pantry-macro-api/internal/services"
)

func main() {
	// 1. Establish PostgreSQL Connection Pool
	pool, err := database.ConnectDB()
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer pool.Close()

	// 2. Initialize Repositories and Services
	userRepo := database.NewUserRepository(pool)
	pantryRepo := database.NewPantryRepository(pool)
	recipeRepo := database.NewRecipeRepository(pool)
	foodRepo := database.NewFoodRepository(pool)
	offService := services.NewOpenFoodFactsService()

	// 3. Initialize Handlers with Repository Dependencies
	authHandler := handlers.NewAuthHandler(userRepo)
	pantryHandler := handlers.NewPantryHandler(pantryRepo)
	recipeHandler := handlers.NewRecipeHandler(recipeRepo)
	foodHandler := handlers.NewFoodHandler(foodRepo, offService)

	router := gin.Default()

	// 4. CORS Configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// 5. Rate Limiters
	generalLimiter := middleware.NewIPRateLimiter(rate.Limit(30), 50)
	router.Use(middleware.RateLimitMiddleware(generalLimiter))

	visionLimiter := middleware.NewIPRateLimiter(rate.Every(12*time.Second), 2)

	// 6. Routes
	api := router.Group("/api")
	{
		// Public Routes
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "online", "system": "Pantry Macro Planner API"})
		})
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.GET("/foods/barcode/:barcode", foodHandler.GetFoodByBarcode)
		api.GET("/foods/search", foodHandler.SearchFoods)

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthRequired())
		{
			// Pantry Management
			protected.GET("/pantry", pantryHandler.ListPantryItems)
			protected.POST("/pantry", pantryHandler.AddPantryItem)
			protected.PATCH("/pantry/:id", pantryHandler.UpdatePantryQuantity)
			protected.DELETE("/pantry/:id", pantryHandler.DeletePantryItem)

			// Recipe & Meal Synthesis
			protected.POST("/recipes", recipeHandler.CreateRecipe)
			protected.GET("/recipes/:id", recipeHandler.GetRecipe)
			protected.POST("/recipes/:id/cook", recipeHandler.CookBatch)

			// Groq Vision Plate Deconstruction
			protected.POST(
				"/foods/decompose-meal",
				middleware.RateLimitMiddleware(visionLimiter),
				foodHandler.DecomposePreparedMeal,
			)
			protected.POST("/foods/ocr-nutrition", foodHandler.ExtractNutritionFromImage)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Production secure API listening on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Server startup failed: %v", err)
	}
}