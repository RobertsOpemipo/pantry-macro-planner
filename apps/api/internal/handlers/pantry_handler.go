package handlers

import (
	"net/http"

	"pantry-macro-api/internal/database"
	"pantry-macro-api/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type PantryHandler struct {
	repo *database.PantryRepository
}

func NewPantryHandler(repo *database.PantryRepository) *PantryHandler {
	return &PantryHandler{repo: repo}
}

func (h *PantryHandler) AddPantryItem(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	var input models.AddPantryItemInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.repo.AddItem(c.Request.Context(), userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add item to pantry"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *PantryHandler) ListPantryItems(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	items, err := h.repo.ListAll(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list pantry items"})
		return
	}

	if items == nil {
		items = []models.PantryItem{}
	}

	c.JSON(http.StatusOK, items)
}

// Alias for ListPantryItems to prevent method mismatch errors
func (h *PantryHandler) GetPantryItems(c *gin.Context) {
	h.ListPantryItems(c)
}

type UpdateQuantityInput struct {
	QuantityRemaining float64 `json:"quantity_remaining" binding:"required,min=0"`
}

func (h *PantryHandler) UpdatePantryQuantity(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pantry item UUID"})
		return
	}

	var input UpdateQuantityInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.repo.UpdateQuantity(c.Request.Context(), userID, id, input.QuantityRemaining); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update quantity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Quantity updated successfully"})
}

func (h *PantryHandler) DeletePantryItem(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid pantry item UUID"})
		return
	}

	if err := h.repo.Delete(c.Request.Context(), userID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete pantry item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pantry item deleted successfully"})
}