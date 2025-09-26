package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// LeaveHandler handles leave-related HTTP requests
type LeaveHandler struct {
	service services.LeaveService
}

func NewLeaveHandler(service services.LeaveService) *LeaveHandler {
	return &LeaveHandler{
		service: service,
	}
}

// ListLeaves handles GET /api/leaves
func (h *LeaveHandler) ListLeaves(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId parameter is required"})
		return
	}

	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	filters := map[string]interface{}{
		"user_id": userID,
	}

	leaves, err := h.service.ListLeaves(orgID.(string), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": leaves})
}

// ApplyLeave handles POST /api/leaves
func (h *LeaveHandler) ApplyLeave(c *gin.Context) {
	var req services.ApplyLeaveRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	leave, err := h.service.ApplyLeave(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": leave})
}

// GetLeave handles GET /api/leaves/:id
func (h *LeaveHandler) GetLeave(c *gin.Context) {
	// TODO: Implement get leave logic
	c.JSON(http.StatusOK, gin.H{"message": "Get leave - coming soon"})
}

// UpdateLeave handles PUT /api/leaves/:id
func (h *LeaveHandler) UpdateLeave(c *gin.Context) {
	// TODO: Implement update leave logic
	c.JSON(http.StatusOK, gin.H{"message": "Update leave - coming soon"})
}

// ApproveLeave handles POST /api/leaves/:id/approve
func (h *LeaveHandler) ApproveLeave(c *gin.Context) {
	// TODO: Implement approve leave logic
	c.JSON(http.StatusOK, gin.H{"message": "Approve leave - coming soon"})
}

// RejectLeave handles POST /api/leaves/:id/reject
func (h *LeaveHandler) RejectLeave(c *gin.Context) {
	// TODO: Implement reject leave logic
	c.JSON(http.StatusOK, gin.H{"message": "Reject leave - coming soon"})
}

// CancelLeave handles POST /api/leaves/:id/cancel
func (h *LeaveHandler) CancelLeave(c *gin.Context) {
	leaveID := c.Param("id")
	if leaveID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "leave_id parameter is required"})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	_, err := h.service.CancelLeave(leaveID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Leave cancelled successfully"})
}

// GetLeaveBalance handles GET /api/leaves/balance/:user_id
func (h *LeaveHandler) GetLeaveBalance(c *gin.Context) {
	userID := c.Param("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id parameter is required"})
		return
	}

	balance, err := h.service.GetLeaveBalance(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": balance})
}
