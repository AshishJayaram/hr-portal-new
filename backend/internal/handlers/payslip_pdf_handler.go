package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// PayslipPDFHandler handles payslip PDF generation requests
type PayslipPDFHandler struct {
	payslipPDFService      services.PayslipPDFService
	salarySlipService      services.SalarySlipService
	userService            services.UserService
	companySettingsService services.CompanySettingsService
}

// NewPayslipPDFHandler creates a new payslip PDF handler
func NewPayslipPDFHandler(
	payslipPDFService services.PayslipPDFService,
	salarySlipService services.SalarySlipService,
	userService services.UserService,
	companySettingsService services.CompanySettingsService,
) *PayslipPDFHandler {
	return &PayslipPDFHandler{
		payslipPDFService:      payslipPDFService,
		salarySlipService:      salarySlipService,
		userService:            userService,
		companySettingsService: companySettingsService,
	}
}

// GeneratePayslipPDF handles payslip PDF generation
func (h *PayslipPDFHandler) GeneratePayslipPDF(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userRole := c.GetString("role")

	// Only HR/Admin can generate payslip PDFs
	if userRole != "HR" && userRole != "Admin" && userRole != "God" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only HR/Admin users can generate payslip PDFs",
		})
		return
	}

	// Get salary slip ID from URL parameter
	salarySlipIDStr := c.Param("id")
	if salarySlipIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Salary slip ID is required",
		})
		return
	}

	// Get salary slip
	salarySlip, err := h.salarySlipService.GetSalarySlip(salarySlipIDStr)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Salary slip not found",
		})
		return
	}

	// Get user information
	user, err := h.userService.GetUser(strconv.FormatUint(uint64(salarySlip.UserID), 10))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user information",
		})
		return
	}

	// Get company settings
	companySettings, err := h.companySettingsService.GetSettings(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get company settings",
		})
		return
	}

	// Generate PDF
	pdfBytes, err := h.payslipPDFService.GeneratePayslipPDF(salarySlip, user, companySettings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate PDF",
		})
		return
	}

	// Set headers for PDF download
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=payslip_"+strconv.FormatUint(uint64(salarySlip.ID), 10)+".pdf")

	// Send PDF
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
