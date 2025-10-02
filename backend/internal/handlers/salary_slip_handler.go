package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// SalarySlipHandler handles salary slip-related HTTP requests
type SalarySlipHandler struct {
	salarySlipService services.SalarySlipService
}

// NewSalarySlipHandler creates a new salary slip handler
func NewSalarySlipHandler(salarySlipService services.SalarySlipService) *SalarySlipHandler {
	return &SalarySlipHandler{
		salarySlipService: salarySlipService,
	}
}

// ListSalarySlips handles listing salary slips
func (h *SalarySlipHandler) ListSalarySlips(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.Query("userId")
	yearStr := c.Query("year")

	// Create filter map
	filters := make(map[string]interface{})
	if userID != "" {
		filters["user_id"] = userID
	}
	if yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			filters["year"] = year
		}
	}

	salarySlips, err := h.salarySlipService.ListSalarySlips(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list salary slips",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"salary_slips": salarySlips,
	})
}

// UploadSalarySlip handles salary slip upload
func (h *SalarySlipHandler) UploadSalarySlip(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	// Get form data
	userIdStr := c.PostForm("userId")
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")

	// Parse month and year
	month := 1
	year := 2024
	if monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}
	if yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil && y > 2000 {
			year = y
		}
	}

	// Use userId from form if provided, otherwise use authenticated user
	targetUserID := userID
	if userIdStr != "" {
		targetUserID = userIdStr
	}

	req := services.UploadSalarySlipRequest{
		UserID:         targetUserID,
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
	}

	salarySlip, err := h.salarySlipService.UploadSalarySlip(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to upload salary slip",
		})
		return
	}

	c.JSON(http.StatusCreated, salarySlip)
}

// GetSalarySlip handles getting a specific salary slip
func (h *SalarySlipHandler) GetSalarySlip(c *gin.Context) {
	salarySlipID := c.Param("id")

	salarySlip, err := h.salarySlipService.GetSalarySlip(salarySlipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Salary slip not found",
		})
		return
	}

	c.JSON(http.StatusOK, salarySlip)
}

// DeleteSalarySlip handles salary slip deletion
func (h *SalarySlipHandler) DeleteSalarySlip(c *gin.Context) {
	salarySlipID := c.Param("id")

	err := h.salarySlipService.DeleteSalarySlip(salarySlipID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete salary slip",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Salary slip deleted successfully",
	})
}

// DownloadSalarySlip handles salary slip download
func (h *SalarySlipHandler) DownloadSalarySlip(c *gin.Context) {
	salarySlipID := c.Param("id")

	salarySlip, err := h.salarySlipService.GetSalarySlip(salarySlipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Salary slip not found",
		})
		return
	}

	// Set headers for file download
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "inline; filename=\""+salarySlip.FileName+".pdf\"")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

	// For now, return a placeholder response with the file URL
	// In a real implementation, you would serve the actual file content
	c.JSON(http.StatusOK, gin.H{
		"fileUrl": salarySlip.FilePath,
		"title":   salarySlip.FileName,
	})
}
