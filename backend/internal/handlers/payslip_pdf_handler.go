package handlers

import (
	"fmt"
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

// GenerateCustomPayslipPDF handles custom payslip PDF generation with user-provided data
func (h *PayslipPDFHandler) GenerateCustomPayslipPDF(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userRole := c.GetString("role")

	// Only HR/Admin can generate payslip PDFs
	if userRole != "HR" && userRole != "Admin" && userRole != "God" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only HR/Admin users can generate payslip PDFs",
		})
		return
	}

	// Define custom payslip data structure
	type CustomPayslipData struct {
		UserID          string  `json:"userId"`
		Month           int     `json:"month"`
		Year            int     `json:"year"`
		LOPAmount       float64 `json:"lopAmount"`
		LOPDays         float64 `json:"lopDays"`
		GrossEarnings   float64 `json:"grossEarnings"`
		TotalDeductions float64 `json:"totalDeductions"`
		NetPay          float64 `json:"netPay"`
		Earnings        struct {
			Basic   float64            `json:"basic"`
			HRA     float64            `json:"hra"`
			Special float64            `json:"specialAllowance"`
			Other   float64            `json:"other"`
			Custom  map[string]float64 `json:"custom"`
		} `json:"earnings"`
		Deductions struct {
			PF              float64            `json:"pf"`
			ESI             float64            `json:"esi"`
			ProfessionalTax float64            `json:"professionalTax"`
			TDS             float64            `json:"tds"`
			Other           float64            `json:"other"`
			Custom          map[string]float64 `json:"custom"`
		} `json:"deductions"`
	}

	var payslipData CustomPayslipData
	if err := c.ShouldBindJSON(&payslipData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Get user information
	user, err := h.userService.GetUser(payslipData.UserID)
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

	// Generate PDF with custom data
	pdfBytes, err := h.payslipPDFService.GenerateCustomPayslipPDF(payslipData, user, companySettings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate PDF",
		})
		return
	}

	// Set headers for PDF download
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=payslip_%s_%d_%d.pdf", payslipData.UserID, payslipData.Month, payslipData.Year))

	// Send PDF
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// GeneratePayslipPDF handles payslip PDF generation from existing salary slip
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
