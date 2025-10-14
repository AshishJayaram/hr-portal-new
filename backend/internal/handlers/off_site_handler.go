package handlers

import (
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// OffSiteHandler handles off-site-related HTTP requests
type OffSiteHandler struct {
	offSiteService services.OffSiteService
}

// NewOffSiteHandler creates a new off-site handler
func NewOffSiteHandler(offSiteService services.OffSiteService) *OffSiteHandler {
	return &OffSiteHandler{
		offSiteService: offSiteService,
	}
}

// ListOffSites handles listing off-site entries
func (h *OffSiteHandler) ListOffSites(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("role")
	viewType := c.Query("view") // "self" or "team"
	requestedUserID := c.Query("userId")

	// Create filter map based on access control
	filters := make(map[string]interface{})

	// Handle team view - let service layer determine if user has team members
	if viewType == "team" {
		// Team view: Get off-sites for all team members (including sub-reports)
		offSites, err := h.offSiteService.ListManagerOffSites(userID, organizationID, filters)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to list team off-sites",
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": offSites})
		return
	}

	// Role-based access control for self view:
	// - HR/Admin/God can see off-sites for any user in their organization
	// - Others can only see their own off-sites
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		// HR/Admin/God can access off-sites for any user
		if requestedUserID != "" {
			filters["user_id"] = requestedUserID
		}
		// If no requestedUserID specified, show all off-sites in organization
	} else {
		// Regular employees and managers can only see their own off-sites
		filters["user_id"] = userID
	}

	offSites, err := h.offSiteService.ListOffSites(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list off-sites",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": offSites})
}

// CreateOffSite handles creating a new off-site entry
func (h *OffSiteHandler) CreateOffSite(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")
	userRole := c.GetString("role")

	var req services.CreateOffSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set organization ID and user ID
	req.OrganizationID = organizationID

	// HR/Admin can create off-sites for other users, employees can only create for themselves
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		// Use the user ID from request if provided, otherwise use authenticated user
		if req.UserID == "" {
			req.UserID = userID
		}
	} else {
		// Regular employees can only create off-sites for themselves
		req.UserID = userID
	}

	offSite, err := h.offSiteService.CreateOffSite(req, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": offSite})
}

// GetOffSite handles getting a specific off-site entry
func (h *OffSiteHandler) GetOffSite(c *gin.Context) {
	offSiteID := c.Param("id")

	offSite, err := h.offSiteService.GetOffSite(offSiteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Off-site entry not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": offSite})
}

// UpdateOffSite handles updating an off-site entry
func (h *OffSiteHandler) UpdateOffSite(c *gin.Context) {
	offSiteID := c.Param("id")
	userID := c.GetString("user_id")
	userRole := c.GetString("role")

	var req services.UpdateOffSiteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user can update this off-site entry
	offSite, err := h.offSiteService.GetOffSite(offSiteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Off-site entry not found"})
		return
	}

	// Only the owner, their manager, or HR/Admin can update
	canUpdate := false
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		canUpdate = true
	} else if strconv.FormatUint(uint64(offSite.UserID), 10) == userID {
		canUpdate = true
	} else if offSite.User.ManagerID != nil {
		if strconv.FormatUint(uint64(*offSite.User.ManagerID), 10) == userID {
			canUpdate = true
		}
	}

	if !canUpdate {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to update this off-site entry"})
		return
	}

	updatedOffSite, err := h.offSiteService.UpdateOffSite(offSiteID, req, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedOffSite})
}

// DeleteOffSite handles deleting an off-site entry
func (h *OffSiteHandler) DeleteOffSite(c *gin.Context) {
	offSiteID := c.Param("id")
	userID := c.GetString("user_id")
	userRole := c.GetString("role")

	// Check if user can delete this off-site entry
	offSite, err := h.offSiteService.GetOffSite(offSiteID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Off-site entry not found"})
		return
	}

	// Only the owner, their manager, or HR/Admin can delete
	canDelete := false
	if userRole == "HR" || userRole == "Admin" || userRole == "God" {
		canDelete = true
	} else if strconv.FormatUint(uint64(offSite.UserID), 10) == userID {
		canDelete = true
	} else if offSite.User.ManagerID != nil {
		if strconv.FormatUint(uint64(*offSite.User.ManagerID), 10) == userID {
			canDelete = true
		}
	}

	if !canDelete {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to delete this off-site entry"})
		return
	}

	err = h.offSiteService.DeleteOffSite(offSiteID, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Off-site entry deleted successfully"})
}

// GetOffSitesByDateRange handles getting off-sites for a specific date range
func (h *OffSiteHandler) GetOffSitesByDateRange(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userRole := c.GetString("role")

	// Parse date parameters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date parameters are required"})
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format. Use YYYY-MM-DD"})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format. Use YYYY-MM-DD"})
		return
	}

	// Only HR/Admin/God can get organization-wide off-sites by date range
	if userRole != "HR" && userRole != "Admin" && userRole != "God" {
		c.JSON(http.StatusForbidden, gin.H{"error": "You don't have permission to access this data"})
		return
	}

	offSites, err := h.offSiteService.GetOffSitesByDateRange(organizationID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get off-sites by date range"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": offSites})
}
