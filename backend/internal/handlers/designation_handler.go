package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// DesignationHandler handles designation-related HTTP requests
type DesignationHandler struct {
	service services.DesignationService
}

// NewDesignationHandler creates a new designation handler
func NewDesignationHandler(service services.DesignationService) *DesignationHandler {
	return &DesignationHandler{
		service: service,
	}
}

// ListDesignations handles GET /api/designations
func (h *DesignationHandler) ListDesignations(c *gin.Context) {
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	filters := make(map[string]interface{})
	if isActive := c.Query("is_active"); isActive != "" {
		filters["is_active"] = isActive == "true"
	}

	designations, err := h.service.ListDesignations(orgID.(string), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": designations})
}

// GetDesignation handles GET /api/designations/:id
func (h *DesignationHandler) GetDesignation(c *gin.Context) {
	id := c.Param("id")
	designation, err := h.service.GetDesignation(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": designation})
}

// CreateDesignation handles POST /api/designations
func (h *DesignationHandler) CreateDesignation(c *gin.Context) {
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	var req services.CreateDesignationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	designation, err := h.service.CreateDesignation(orgID.(string), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": designation})
}

// UpdateDesignation handles PATCH /api/designations/:id
func (h *DesignationHandler) UpdateDesignation(c *gin.Context) {
	id := c.Param("id")

	var req services.UpdateDesignationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	designation, err := h.service.UpdateDesignation(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": designation})
}

// DeleteDesignation handles DELETE /api/designations/:id
func (h *DesignationHandler) DeleteDesignation(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.DeleteDesignation(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Designation deleted successfully"})
}

