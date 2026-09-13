package handlers

import (
	"net/http"
	"pantry-macro-api/internal/database"
	"pantry-macro-api/internal/middleware"
	"pantry-macro-api/internal/models"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	repo *database.UserRepository
}

func NewAuthHandler(repo *database.UserRepository) *AuthHandler {
	return &AuthHandler{repo: repo}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input models.AuthCredentials
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.repo.Register(c.Request.Context(), input.Email, input.Password, input.FullName)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists or invalid data"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session"})
		return
	}

	c.JSON(http.StatusCreated, models.AuthResponse{Token: token, User: *user})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input models.AuthCredentials
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.repo.Authenticate(c.Request.Context(), input.Email, input.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session"})
		return
	}

	c.JSON(http.StatusOK, models.AuthResponse{Token: token, User: *user})
}