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
	userRole := c.GetString("user_role")

	stats, err := h.dashboardService.GetStats(organizationID, userID, userRole)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get dashboard statistics",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
