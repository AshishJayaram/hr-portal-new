package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// DashboardHandler handles dashboard-related HTTP requests
type DashboardHandler struct {
	dashboardService services.DashboardService
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(dashboardService services.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
	}
}

// GetStats handles getting dashboard statistics
func (h *DashboardHandler) GetStats(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("user_role") // Middleware sets "user_role", not "role"

	// Log for debugging
	if organizationID == "" || userID == "" || userRole == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing required context values",
			"details": gin.H{
				"organization_id": organizationID,
				"user_id":         userID,
				"user_role":       userRole,
			},
		})
		return
	}

	stats, err := h.dashboardService.GetStats(organizationID, userID, userRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get dashboard statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
