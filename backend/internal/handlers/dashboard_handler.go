package handlers

import (
	"log"
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

	// Log context values for debugging
	log.Printf("Dashboard GetStats - orgID: %s, userID: %s, role: %s", organizationID, userID, userRole)

	if organizationID == "" {
		log.Printf("ERROR: organization_id is empty")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Organization ID is required",
		})
		return
	}

	if userID == "" {
		log.Printf("ERROR: user_id is empty")
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required",
		})
		return
	}

	stats, err := h.dashboardService.GetStats(organizationID, userID, userRole)
	if err != nil {
		log.Printf("ERROR: Failed to get dashboard statistics: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get dashboard statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
