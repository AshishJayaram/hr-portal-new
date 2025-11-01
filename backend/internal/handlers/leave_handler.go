package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/services"

	"github.com/sirupsen/logrus"

	"github.com/gin-gonic/gin"
)

// Helper function to get category names for error messages
func getCategoryNames(categories []models.LeaveCategory) []string {
	names := make([]string, 0, len(categories))
	for _, cat := range categories {
		names = append(names, cat.Name)
	}
	return names
}

// LeaveHandler handles leave-related HTTP requests
type LeaveHandler struct {
	service         services.LeaveService
	lopService      services.LOPService
	auditService    services.AuditService
	userService     services.UserService
	categoryService services.LeaveCategoryService
}

func NewLeaveHandler(service services.LeaveService, lopService services.LOPService, auditService services.AuditService, userService services.UserService, categoryService services.LeaveCategoryService) *LeaveHandler {
	return &LeaveHandler{
		service:         service,
		lopService:      lopService,
		auditService:    auditService,
		userService:     userService,
		categoryService: categoryService,
	}
}

// ListLeaves handles GET /api/leaves
func (h *LeaveHandler) ListLeaves(c *gin.Context) {
	userID := c.Query("userId")
	viewType := c.Query("view") // "self" or "team"

	// Get pagination parameters
	page := 1
	perPage := 10
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if parsed, err := strconv.Atoi(pp); err == nil && parsed > 0 && parsed <= 100 {
			perPage = parsed
		}
	}

	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	// Get current user ID from context
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if pagination is requested
	usePagination := c.Query("paginated") == "true"

	if usePagination {
		// Use paginated methods
		var result *services.PaginatedResponse
		var err error

		if viewType == "team" {
			// Manager view: Get leaves for all team members (including sub-reports)
			filters := make(map[string]interface{})

			// Add status filter if provided
			if status := c.Query("status"); status != "" {
				filters["status"] = status
			}

			result, err = h.service.GetTeamLeavesRecursivePaginated(currentUserID.(string), orgID.(string), filters, page, perPage)
		} else {
			// Self view: Get leaves for specific user
			if userID == "" {
				// If no userId provided, use current user's ID
				userID = currentUserID.(string)
			}

			filters := map[string]interface{}{
				"user_id": userID,
			}

			result, err = h.service.ListLeavesPaginated(orgID.(string), filters, page, perPage)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, result)
	} else {
		// Use non-paginated methods (backward compatibility)
		var leaves []models.Leave
		var err error

		if viewType == "team" {
			// Manager view: Get leaves for all team members (including sub-reports)
			filters := make(map[string]interface{})

			// Add status filter if provided
			if status := c.Query("status"); status != "" {
				filters["status"] = status
			}

			leaves, err = h.service.GetTeamLeavesRecursive(currentUserID.(string), orgID.(string), filters)
		} else {
			// Self view: Get leaves for specific user
			if userID == "" {
				// If no userId provided, use current user's ID
				userID = currentUserID.(string)
			}

			filters := map[string]interface{}{
				"user_id": userID,
			}

			leaves, err = h.service.ListLeaves(orgID.(string), filters)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": leaves})
	}
}

// ApplyLeave handles POST /api/leaves
func (h *LeaveHandler) ApplyLeave(c *gin.Context) {
	// Get user ID and organization ID from context (set by auth middleware)
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	userRole, exists := c.Get("user_role")
	if !exists {
		userRole = ""
	}

	var req services.ApplyLeaveRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set organization ID from context
	req.OrganizationID = orgID.(string)

	// Check if user is applying on behalf of someone else
	// HR and Admin can apply on behalf of employees
	isHRorAdmin := userRole == "HR" || userRole == "Admin" || userRole == "God"

	// If request includes user_id and current user is HR/Admin, use the provided user_id
	// Otherwise, use the current user's ID
	if req.UserID != "" && isHRorAdmin {
		// Validate that the target user is in the same organization
		targetUser, err := h.userService.GetUser(req.UserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID: " + err.Error()})
			return
		}

		// Verify target user is in the same organization
		if fmt.Sprintf("%d", targetUser.OrganizationID) != orgID.(string) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Cannot apply leave for user in different organization"})
			return
		}

		// Use the provided user ID (HR/Admin applying on behalf of employee)
		// req.UserID is already set from the request body
	} else {
		// Regular employee applying for themselves, or invalid user_id provided
		req.UserID = currentUserID.(string)
	}

	// Map leave type to category ID - dynamically lookup from database
	// First, try to find category by name (handles variations like "Casual" vs "Casual Leave")
	var categoryID string
	if req.Type == "LOP" {
		// LOP doesn't need a specific category
		categoryID = "0"
	} else {
		// Get all categories for the organization
		orgIDStr := fmt.Sprintf("%v", orgID)
		categories, err := h.categoryService.ListCategories(orgIDStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch leave categories: %v", err)})
			return
		}

		// Try exact match first (case-insensitive)
		var foundCategory *models.LeaveCategory
		for i := range categories {
			if strings.EqualFold(strings.TrimSpace(categories[i].Name), strings.TrimSpace(req.Type)) {
				foundCategory = &categories[i]
				break
			}
		}

		// If not found, try partial match (e.g., "Casual" matches "Casual Leave")
		if foundCategory == nil {
			reqTypeLower := strings.ToLower(strings.TrimSpace(req.Type))
			for i := range categories {
				catNameLower := strings.ToLower(strings.TrimSpace(categories[i].Name))
				// Check if request type is contained in category name or vice versa
				if strings.Contains(catNameLower, reqTypeLower) || strings.Contains(reqTypeLower, catNameLower) {
					foundCategory = &categories[i]
					break
				}
			}
		}

		if foundCategory != nil {
			categoryID = strconv.FormatUint(uint64(foundCategory.ID), 10)
		} else {
			// Fallback to hardcoded map for backwards compatibility
			categoryIDMap := map[string]string{
				"Casual Leave":       "2",
				"Casual":             "2",
				"Sick Leave":         "5",
				"Sick":               "5",
				"Professional Leave": "6",
				"Professional":       "6",
				"Test Category":      "1",
			}

			if mappedID, exists := categoryIDMap[req.Type]; exists {
				categoryID = mappedID
			} else {
				// Provide helpful error message with available categories
				availableNames := getCategoryNames(categories)
				if len(availableNames) == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid leave type: %s. No active categories found for this organization.", req.Type)})
				} else {
					c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid leave type: %s. Available categories: %v", req.Type, availableNames)})
				}
				return
			}
		}
	}

	req.CategoryID = categoryID

	leave, err := h.service.ApplyLeave(req, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": leave})
}

// GetLeave handles GET /api/leaves/:id
func (h *LeaveHandler) GetLeave(c *gin.Context) {
	leaveID := c.Param("id")
	if leaveID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "leave_id parameter is required"})
		return
	}

	leave, err := h.service.GetLeave(leaveID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": leave})
}

// CalculateSpillover handles POST /api/leaves/calculate-spillover
func (h *LeaveHandler) CalculateSpillover(c *gin.Context) {
	// Get user ID and organization ID from context
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID not found"})
		return
	}

	var req struct {
		CategoryID string  `json:"category_id" binding:"required"`
		Days       float64 `json:"days" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate spillover using LOP service
	spillover, err := h.lopService.CalculateSpillover(userID.(string), orgID.(string), req.CategoryID, req.Days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": spillover})
}

// GetTeamLeaveBalances handles GET /api/leaves/team-balances
func (h *LeaveHandler) GetTeamLeaveBalances(c *gin.Context) {
	// Get current user ID from context
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get organization ID from context
	organizationID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization not found"})
		return
	}

	// Get team leave balances
	teamBalances, err := h.service.GetTeamLeaveBalances(currentUserID.(string), organizationID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": teamBalances})
}

// UpdateLeave handles PATCH /api/leaves/:id
func (h *LeaveHandler) UpdateLeave(c *gin.Context) {
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

	var req services.UpdateLeaveRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the leave to check ownership
	leave, err := h.service.GetLeave(leaveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave not found"})
		return
	}

	// Check if user owns this leave (only the leave owner can update it)
	if fmt.Sprintf("%d", leave.UserID) != userID.(string) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own leave requests"})
		return
	}

	updatedLeave, err := h.service.UpdateLeave(leaveID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": updatedLeave})
}

// ApproveLeave handles POST /api/leaves/:id/approve
func (h *LeaveHandler) ApproveLeave(c *gin.Context) {
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

	// Get the leave to check if it exists and is pending
	leave, err := h.service.GetLeave(leaveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave not found"})
		return
	}

	// Check if leave is in pending status
	if leave.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending leaves can be approved"})
		return
	}

	// Authorization check: Only HR/Admin/God or the leave requester's manager can approve
	userRole, _ := c.Get("user_role")
	loggedInUserRole := ""
	if role, ok := userRole.(string); ok {
		loggedInUserRole = role
	}

	isHRorAdmin := loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God"

	// Check if user is manager of the leave requester
	// Convert userID from context (string) to uint for comparison
	userIDUint, err := strconv.ParseUint(userID.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Debug: Check if User is loaded
	if leave.User.ID == 0 {
		logrus.Warn("Leave.User not loaded properly, attempting to reload")
		// Try to reload the user if not loaded
		leaveUser, err := h.userService.GetUser(strconv.FormatUint(uint64(leave.UserID), 10))
		if err == nil {
			leave.User = *leaveUser
		}
	}

	isManager := leave.User.ManagerID != nil && *leave.User.ManagerID == uint(userIDUint)

	if !isHRorAdmin && !isManager {
		// Debug: Log the authorization check
		logrus.WithFields(logrus.Fields{
			"loggedInUserID":     userID,
			"loggedInUserRole":   loggedInUserRole,
			"leaveUserID":        leave.UserID,
			"leaveUserManagerID": leave.User.ManagerID,
			"isHRorAdmin":        isHRorAdmin,
			"isManager":          isManager,
		}).Warn("Leave approval authorization check failed")
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to approve this leave request"})
		return
	}

	// Approve the leave
	approvedLeave, err := h.service.ApproveLeave(leaveID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log audit entry for leave approval
	orgIDStr := strconv.FormatUint(uint64(approvedLeave.OrganizationID), 10)
	leaveIDStr := strconv.FormatUint(uint64(approvedLeave.ID), 10)
	changeSummary := fmt.Sprintf("Leave approved: %s from %s to %s", approvedLeave.Type, approvedLeave.FromDate.Format("2006-01-02"), approvedLeave.ToDate.Format("2006-01-02"))
	if err := h.auditService.LogLeaveChange(orgIDStr, leaveIDStr, userID.(string), "APPROVE", changeSummary, c.Request); err != nil {
		// Failed to log audit
	}

	c.JSON(http.StatusOK, gin.H{"data": approvedLeave, "message": "Leave approved successfully"})
}

// RejectLeave handles POST /api/leaves/:id/reject
func (h *LeaveHandler) RejectLeave(c *gin.Context) {
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

	// Parse request body for rejection reason
	var req struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Get the leave to check if it exists and is pending
	leave, err := h.service.GetLeave(leaveID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Leave not found"})
		return
	}

	// Check if leave is in pending status
	if leave.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending leaves can be rejected"})
		return
	}

	// Authorization check: Only HR/Admin/God or the leave requester's manager can reject
	userRole, _ := c.Get("user_role")
	loggedInUserRole := ""
	if role, ok := userRole.(string); ok {
		loggedInUserRole = role
	}

	isHRorAdmin := loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God"

	// Check if user is manager of the leave requester
	// Convert userID from context (string) to uint for comparison
	userIDUint, err := strconv.ParseUint(userID.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	isManager := leave.User.ManagerID != nil && *leave.User.ManagerID == uint(userIDUint)

	if !isHRorAdmin && !isManager {
		// Debug: Log the authorization check
		logrus.WithFields(logrus.Fields{
			"loggedInUserID":     userID,
			"loggedInUserRole":   loggedInUserRole,
			"leaveUserID":        leave.UserID,
			"leaveUserManagerID": leave.User.ManagerID,
			"isHRorAdmin":        isHRorAdmin,
			"isManager":          isManager,
		}).Warn("Leave rejection authorization check failed")
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to reject this leave request"})
		return
	}

	// Reject the leave
	rejectedLeave, err := h.service.RejectLeave(leaveID, userID.(string), req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log audit entry for leave rejection
	orgIDStr := strconv.FormatUint(uint64(rejectedLeave.OrganizationID), 10)
	leaveIDStr := strconv.FormatUint(uint64(rejectedLeave.ID), 10)
	changeSummary := fmt.Sprintf("Leave rejected: %s from %s to %s (Reason: %s)", rejectedLeave.Type, rejectedLeave.FromDate.Format("2006-01-02"), rejectedLeave.ToDate.Format("2006-01-02"), req.Reason)
	if err := h.auditService.LogLeaveChange(orgIDStr, leaveIDStr, userID.(string), "REJECT", changeSummary, c.Request); err != nil {
		// Failed to log audit
	}

	c.JSON(http.StatusOK, gin.H{"data": rejectedLeave, "message": "Leave rejected successfully"})
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

// EditLeave handles editing a pending leave request (reverts to pending state)
// @Summary Edit a leave request
// @Description Edit the details of a leave request (puts it back to pending state for re-approval)
// @Tags leaves
// @Security BearerAuth
// @Security OrganizationAuth
// @Accept json
// @Produce json
// @Param id path string true "Leave ID"
// @Param body body services.EditLeaveRequest true "Edit leave request"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/leaves/{id}/edit [put]
func (h *LeaveHandler) EditLeave(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave ID"})
		return
	}

	var req services.EditLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format: " + err.Error()})
		return
	}

	// Make sure the leave ID matches the URL parameter
	req.LeaveID = strconv.FormatUint(id, 10)

	userID := c.GetString("user_id")
	organizationID := c.GetString("organization_id")

	updatedLeave, err := h.service.EditLeave(req, userID, organizationID, c.Request)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "leave not found" {
			status = http.StatusNotFound
		} else if strings.Contains(err.Error(), "not authorized") {
			status = http.StatusForbidden
		} else if strings.Contains(err.Error(), "already") || strings.Contains(err.Error(), "not in pending state") {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	logrus.WithFields(logrus.Fields{
		"leave_id": id,
		"user_id":  userID,
		"org_id":   organizationID,
		"action":   "edit",
	}).Info("Leave request edited")

	c.JSON(http.StatusOK, gin.H{"message": "Leave request updated successfully and reverted to pending state", "leave": updatedLeave})
}
