package handlers

import (
	"net/http"

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

	salarySlips, err := h.salarySlipService.ListSalarySlips(organizationID, nil)
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

	req := services.UploadSalarySlipRequest{
		UserID:         userID,
		OrganizationID: organizationID,
		Month:          1,    // Default to January
		Year:           2024, // Default year
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

	// For now, return a placeholder response
	// In a real implementation, you would serve the actual file
	c.JSON(http.StatusOK, gin.H{
		"message": "Salary slip download - file path: " + salarySlip.FilePath,
	})
}
