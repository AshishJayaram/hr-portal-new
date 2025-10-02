package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	userService services.UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// ListUsers handles listing users
// @Summary List users
// @Description Get list of users in organization
// @Tags users
// @Security BearerAuth
// @Security OrganizationAuth
// @Produce json
// @Param page query int false "Page number"
// @Param limit query int false "Items per page"
// @Param search query string false "Search term"
// @Param role query string false "Filter by role"
// @Param department query string false "Filter by department"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/users [get]
func (h *UserHandler) ListUsers(c *gin.Context) {
	organizationID, _ := c.Get("current_organization_id")

	// Parse query parameters
	filters := make(map[string]interface{})

	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil && page > 0 {
			filters["page"] = page
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters["limit"] = limit
		}
	}

	if search := c.Query("search"); search != "" {
		filters["search"] = search
	}

	if role := c.Query("role"); role != "" {
		filters["role"] = role
	}

	if department := c.Query("department"); department != "" {
		filters["department"] = department
	}

	users, err := h.userService.ListUsers(organizationID.(string), filters)
	if err != nil {
		logrus.WithError(err).Error("Failed to list users")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch users",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  users,
		"total": len(users),
	})
}

// GetUser handles getting a single user
// @Summary Get user
// @Description Get user details by ID
// @Tags users
// @Security BearerAuth
// @Security OrganizationAuth
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	user, err := h.userService.GetUser(userID)
	if err != nil {
		logrus.WithError(err).Error("Failed to get user")
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
	})
}

// CreateUser handles creating a new user
// @Summary Create user
// @Description Create a new user
// @Tags users
// @Security BearerAuth
// @Security OrganizationAuth
// @Accept json
// @Produce json
// @Param request body services.CreateUserRequest true "User data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req services.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Set organization ID from context
	organizationID, _ := c.Get("current_organization_id")
	req.OrganizationID = organizationID.(string)

	user, err := h.userService.CreateUser(req, c.Request)
	if err != nil {
		logrus.WithError(err).Error("Failed to create user")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    user,
		"message": "User created successfully",
	})
}

// UpdateUser handles updating a user
// @Summary Update user
// @Description Update user details
// @Tags users
// @Security BearerAuth
// @Security OrganizationAuth
// @Accept json
// @Produce json
// @Param id path string true "User ID"
// @Param request body services.UpdateUserRequest true "User data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/users/{id} [patch]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	var req services.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	user, err := h.userService.UpdateUser(userID, req, c.Request)
	if err != nil {
		logrus.WithError(err).Error("Failed to update user")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    user,
		"message": "User updated successfully",
	})
}

// DeleteUser handles deleting a user
// @Summary Delete user
// @Description Delete a user
// @Tags users
// @Security BearerAuth
// @Security OrganizationAuth
// @Produce json
// @Param id path string true "User ID"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	err := h.userService.DeleteUser(userID, c.Request)
	if err != nil {
		logrus.WithError(err).Error("Failed to delete user")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}

// ChangePassword handles password change
// @Summary Change password
// @Description Change user password
// @Tags users
// @Security BearerAuth
// @Accept json
// @Produce json
// @Param request body map[string]string true "Password change data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Router /api/users/change-password [post]
func (h *UserHandler) ChangePassword(c *gin.Context) {
	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Current password and new password are required",
		})
		return
	}

	userID, _ := c.Get("user_id")
	err := h.userService.ChangePassword(userID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		logrus.WithError(err).Error("Failed to change password")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password changed successfully",
	})
}
