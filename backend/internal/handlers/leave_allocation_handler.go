package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// LeaveAllocationHandler handles leave allocation-related HTTP requests
type LeaveAllocationHandler struct {
	leaveAllocationService services.LeaveAllocationService
}

// NewLeaveAllocationHandler creates a new leave allocation handler
func NewLeaveAllocationHandler(leaveAllocationService services.LeaveAllocationService) *LeaveAllocationHandler {
	return &LeaveAllocationHandler{
		leaveAllocationService: leaveAllocationService,
	}
}

// CreateLeaveAllocation handles creating a new leave allocation
func (h *LeaveAllocationHandler) CreateLeaveAllocation(c *gin.Context) {
	organizationID, exists := c.Get("organization_id")
	if !exists || organizationID == nil || organizationID.(string) == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Organization ID is required",
		})
		return
	}

	var req services.CreateLeaveAllocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request format: %v", err),
		})
		return
	}

	req.OrganizationID = organizationID.(string)

	allocation, err := h.leaveAllocationService.CreateAllocation(req)
	if err != nil {
		errMsg := err.Error()
		// Check if it's a duplicate allocation error (409 Conflict)
		if strings.Contains(errMsg, "already exists") {
			c.JSON(http.StatusConflict, gin.H{
				"error": fmt.Sprintf("Failed to create leave allocation: %v", err),
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to create leave allocation: %v", err),
			})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": allocation,
	})
}

// GetLeaveAllocation handles getting a specific leave allocation
func (h *LeaveAllocationHandler) GetLeaveAllocation(c *gin.Context) {
	allocationID := c.Param("id")

	allocation, err := h.leaveAllocationService.GetAllocation(allocationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Leave allocation not found",
		})
		return
	}

	c.JSON(http.StatusOK, allocation)
}

// ListLeaveAllocations handles listing leave allocations
func (h *LeaveAllocationHandler) ListLeaveAllocations(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	allocations, err := h.leaveAllocationService.ListAllocations(organizationID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list leave allocations",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"leave_allocations": allocations,
	})
}

// UpdateLeaveAllocation handles updating a leave allocation
func (h *LeaveAllocationHandler) UpdateLeaveAllocation(c *gin.Context) {
	allocationID := c.Param("id")

	var req services.UpdateLeaveAllocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	allocation, err := h.leaveAllocationService.UpdateAllocation(allocationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to update leave allocation: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, allocation)
}

// DeleteLeaveAllocation handles deleting a leave allocation
func (h *LeaveAllocationHandler) DeleteLeaveAllocation(c *gin.Context) {
	allocationID := c.Param("id")

	err := h.leaveAllocationService.DeleteAllocation(allocationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete leave allocation",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave allocation deleted successfully",
	})
}

// GetLeaveAllocations handles getting leave allocations for a specific user
func (h *LeaveAllocationHandler) GetLeaveAllocations(c *gin.Context) {
	userID := c.Param("user_id")
	year := 2025 // Default year, could be made configurable

	allocations, err := h.leaveAllocationService.GetUserAllocations(userID, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get leave allocations",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"leave_allocations": allocations,
	})
}
