package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// LeaveCategoryHandler handles leave category-related HTTP requests
type LeaveCategoryHandler struct {
	leaveCategoryService services.LeaveCategoryService
}

// NewLeaveCategoryHandler creates a new leave category handler
func NewLeaveCategoryHandler(leaveCategoryService services.LeaveCategoryService) *LeaveCategoryHandler {
	return &LeaveCategoryHandler{
		leaveCategoryService: leaveCategoryService,
	}
}

// ListLeaveCategories handles listing leave categories
func (h *LeaveCategoryHandler) ListLeaveCategories(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	categories, err := h.leaveCategoryService.ListCategories(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list leave categories",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"leave_categories": categories,
	})
}

// CreateLeaveCategory handles creating a new leave category
func (h *LeaveCategoryHandler) CreateLeaveCategory(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	var req services.CreateLeaveCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	req.OrganizationID = organizationID

	category, err := h.leaveCategoryService.CreateCategory(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create leave category",
		})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// GetLeaveCategory handles getting a specific leave category
func (h *LeaveCategoryHandler) GetLeaveCategory(c *gin.Context) {
	categoryID := c.Param("id")

	category, err := h.leaveCategoryService.GetCategory(categoryID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Leave category not found",
		})
		return
	}

	c.JSON(http.StatusOK, category)
}

// UpdateLeaveCategory handles updating a leave category
func (h *LeaveCategoryHandler) UpdateLeaveCategory(c *gin.Context) {
	categoryID := c.Param("id")

	var req services.UpdateLeaveCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	category, err := h.leaveCategoryService.UpdateCategory(categoryID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update leave category",
		})
		return
	}

	c.JSON(http.StatusOK, category)
}

// DeleteLeaveCategory handles deleting a leave category
func (h *LeaveCategoryHandler) DeleteLeaveCategory(c *gin.Context) {
	categoryID := c.Param("id")

	err := h.leaveCategoryService.DeleteCategory(categoryID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete leave category",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave category deleted successfully",
	})
}
