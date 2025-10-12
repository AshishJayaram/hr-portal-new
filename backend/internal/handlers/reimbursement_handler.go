package handlers

import (
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type ReimbursementHandler struct {
	service *services.ReimbursementService
}

func NewReimbursementHandler(service *services.ReimbursementService) *ReimbursementHandler {
	return &ReimbursementHandler{service: service}
}

func (h *ReimbursementHandler) CreateReimbursement(c *gin.Context) {
	userID := c.GetUint("user_id")
	organizationID := c.GetUint("organization_id")

	reason := c.PostForm("reason")
	amountStr := c.PostForm("amount")
	dateStr := c.PostForm("date")

	if reason == "" || amountStr == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	// Get uploaded files
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	bills := form.File["bills"]
	if len(bills) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one bill is required"})
		return
	}

	reimbursement, err := h.service.CreateReimbursement(userID, organizationID, reason, amount, date, bills)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": reimbursement})
}

func (h *ReimbursementHandler) GetReimbursements(c *gin.Context) {
	organizationID := c.GetUint("organization_id")
	loggedInUserID := c.GetUint("user_id")
	loggedInUserRole := c.GetString("role")
	userIDStr := c.Query("user_id")
	status := c.Query("status")

	var userID *uint
	if userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			uid := uint(id)
			userID = &uid
		}
	}

	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	// Role-based access control:
	// - HR/Admin/God can see all reimbursements in their organization
	// - Managers can see their own and their subordinates' reimbursements
	// - Employees can only see their own reimbursements
	if loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God" {
		// HR/Admin/God can access reimbursements for any user
		if userID != nil {
			// If specific user requested, only show that user's reimbursements
			reimbursements, err := h.service.GetReimbursements(organizationID, userID, statusPtr)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": reimbursements})
			return
		}
		// If no specific user, show all reimbursements in organization
		reimbursements, err := h.service.GetReimbursements(organizationID, nil, statusPtr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": reimbursements})
		return
	} else {
		// Regular employees can only see their own reimbursements
		// Managers can see their own and their team's reimbursements
		reimbursements, err := h.service.GetReimbursementsForUser(organizationID, loggedInUserID, statusPtr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": reimbursements})
		return
	}
}

func (h *ReimbursementHandler) GetReimbursementByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	loggedInUserID := c.GetUint("user_id")
	loggedInUserRole := c.GetString("role")

	reimbursement, err := h.service.GetReimbursementByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reimbursement not found"})
		return
	}

	// Role-based access control:
	// - HR/Admin/God can see any reimbursement in their organization
	// - Employees can only see their own reimbursements
	if loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God" {
		// HR/Admin/God can access any reimbursement in their organization
		c.JSON(http.StatusOK, gin.H{"data": reimbursement})
		return
	} else {
		// Regular employees can only see their own reimbursements
		if reimbursement.UserID != loggedInUserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only view your own reimbursements"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": reimbursement})
		return
	}
}

func (h *ReimbursementHandler) ApproveReimbursement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	userID := c.GetUint("user_id")

	err = h.service.ApproveReimbursement(uint(id), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reimbursement approved successfully"})
}

func (h *ReimbursementHandler) RejectReimbursement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")

	err = h.service.RejectReimbursement(uint(id), userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reimbursement rejected successfully"})
}

func (h *ReimbursementHandler) ReturnReimbursement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")

	err = h.service.ReturnReimbursement(uint(id), userID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reimbursement returned for corrections"})
}

func (h *ReimbursementHandler) GetReimbursementBills(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	bills, err := h.service.GetReimbursementBills(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": bills})
}

func (h *ReimbursementHandler) DeleteReimbursement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	// RBAC: allow delete if HR/Admin/God or if the requester is the uploader (owner)
	requesterID := c.GetUint("user_id")
	requesterRole := c.GetString("role")

	// HR/Admin/God can delete any reimbursement in org
	if requesterRole == "HR" || requesterRole == "Admin" || requesterRole == "God" {
		err = h.service.DeleteReimbursement(uint(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Reimbursement deleted successfully"})
		return
	}

	// Otherwise, only allow owner (uploader)
	reimbursement, getErr := h.service.GetReimbursementByID(uint(id))
	if getErr != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reimbursement not found"})
		return
	}

	if reimbursement.UserID != requesterID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own reimbursement"})
		return
	}

	err = h.service.DeleteReimbursement(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reimbursement deleted successfully"})
}
