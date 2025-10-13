package handlers

import (
	"mime/multipart"
	"net/http"
	"os"
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
	loggedInUserIDStr := c.GetString("user_id")
	loggedInUserID, err := strconv.ParseUint(loggedInUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	loggedInUserRole := c.GetString("user_role")
	organizationIDStr := c.GetString("organization_id")
	organizationID, err := strconv.ParseUint(organizationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	reason := c.PostForm("reason")
	description := c.PostForm("description")
	amountStr := c.PostForm("amount")
	dateStr := c.PostForm("date")
	applyForUserIDStr := c.PostForm("apply_for_user_id") // For HR/Admin to apply on behalf of others

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

	// Determine the user ID for the reimbursement
	var userID uint
	if applyForUserIDStr != "" && (loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God") {
		// HR/Admin can apply on behalf of others
		if id, err := strconv.ParseUint(applyForUserIDStr, 10, 32); err == nil {
			userID = uint(id)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
			return
		}
	} else {
		// Regular employees apply for themselves
		userID = uint(loggedInUserID)
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

	reimbursement, err := h.service.CreateReimbursement(userID, uint(organizationID), reason, description, amount, date, bills)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": reimbursement})
}

func (h *ReimbursementHandler) GetReimbursements(c *gin.Context) {
	organizationIDStr := c.GetString("organization_id")
	organizationID, err := strconv.ParseUint(organizationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}
	loggedInUserIDStr := c.GetString("user_id")
	loggedInUserID, err := strconv.ParseUint(loggedInUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	loggedInUserRole := c.GetString("user_role")
	userIDStr := c.Query("user_id")
	status := c.Query("status")
	view := c.Query("view") // "my" or "team" for HR/Admin

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
	// - Employees can only see their own reimbursements
	if loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God" {
		// HR/Admin/God can access reimbursements for any user
		if userID != nil {
			// If specific user requested, only show that user's reimbursements
			reimbursements, err := h.service.GetReimbursements(uint(organizationID), userID, statusPtr)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": reimbursements})
			return
		}

		// Handle view parameter for HR/Admin
		if view == "my" {
			// Show only HR/Admin's own reimbursements
			loggedInUserIDUint := uint(loggedInUserID)
			reimbursements, err := h.service.GetReimbursements(uint(organizationID), &loggedInUserIDUint, statusPtr)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": reimbursements})
			return
		} else if view == "team" {
			// Show all reimbursements in organization except HR/Admin's own
			reimbursements, err := h.service.GetTeamReimbursements(uint(organizationID), uint(loggedInUserID), statusPtr)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"data": reimbursements})
			return
		}

		// Default: show all reimbursements in organization
		reimbursements, err := h.service.GetReimbursements(uint(organizationID), nil, statusPtr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": reimbursements})
		return
	} else {
		// Regular employees can only see their own reimbursements
		loggedInUserIDUint := uint(loggedInUserID)
		reimbursements, err := h.service.GetReimbursements(uint(organizationID), &loggedInUserIDUint, statusPtr)
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
	loggedInUserRole := c.GetString("user_role")

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

	userIDStr := c.GetString("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.service.ApproveReimbursement(uint(id), uint(userID))
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

	userIDStr := c.GetString("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.service.RejectReimbursement(uint(id), uint(userID), req.Reason)
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

	userIDStr := c.GetString("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	err = h.service.ReturnReimbursement(uint(id), uint(userID), req.Reason)
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
	requesterIDStr := c.GetString("user_id")
	requesterID, err := strconv.ParseUint(requesterIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	requesterRole := c.GetString("user_role")

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

	if reimbursement.UserID != uint(requesterID) {
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

func (h *ReimbursementHandler) UpdateReimbursement(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	loggedInUserIDStr := c.GetString("user_id")
	loggedInUserID, err := strconv.ParseUint(loggedInUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}
	loggedInUserRole := c.GetString("user_role")

	// Get existing reimbursement
	reimbursement, err := h.service.GetReimbursementByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reimbursement not found"})
		return
	}

	// Check permissions: user can only update their own reimbursements, HR/Admin can update any
	if loggedInUserRole != "HR" && loggedInUserRole != "Admin" && loggedInUserRole != "God" {
		if reimbursement.UserID != uint(loggedInUserID) {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own reimbursements"})
			return
		}
	}

	// Only allow updates for pending reimbursements
	if reimbursement.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending reimbursements can be updated"})
		return
	}

	reason := c.PostForm("reason")
	description := c.PostForm("description")
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

	// Get uploaded files (optional for updates)
	var bills []*multipart.FileHeader
	form, err := c.MultipartForm()
	if err == nil && form != nil {
		bills = form.File["bills"]
	}

	// Update reimbursement
	reimbursement.Reason = reason
	reimbursement.Description = description
	reimbursement.Amount = amount
	reimbursement.Date = date

	err = h.service.UpdateReimbursement(reimbursement, bills)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": reimbursement})
}

// ServeReimbursementBill serves the actual reimbursement bill file
func (h *ReimbursementHandler) ServeReimbursementBill(c *gin.Context) {
	billID := c.Param("id")

	bill, err := h.service.GetReimbursementBillByID(billID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bill not found",
		})
		return
	}

	// Check if file exists on disk
	if _, err := os.Stat(bill.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "File not found on disk",
		})
		return
	}

	// Set headers for file viewing
	c.Header("Content-Type", bill.MimeType)
	c.Header("Content-Disposition", "inline; filename=\""+bill.FileName+"\"")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

	// Serve the file
	c.File(bill.FilePath)
}
