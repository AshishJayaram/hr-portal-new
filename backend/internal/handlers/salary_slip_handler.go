package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

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

	// Add fileUrl to each salary slip for frontend consumption
	baseURL := "http://localhost:8080" // TODO: Make this configurable
	for i := range salarySlips {
		salarySlips[i].FileUrl = fmt.Sprintf("%s/api/files/salary-slips/%d", baseURL, salarySlips[i].ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"salary_slips": salarySlips,
	})
}

// AddSalarySlip handles salary slip upload
func (h *SalarySlipHandler) AddSalarySlip(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	// Get form data
	userIdStr := c.PostForm("userId")
	monthStr := c.PostForm("month")
	yearStr := c.PostForm("year")
	lopDaysStr := c.PostForm("lopDays")
	lopAmountStr := c.PostForm("lopAmount")

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

	// Parse LOP fields
	lopDays := 0.0
	lopAmount := 0.0
	if lopDaysStr != "" {
		if d, err := strconv.ParseFloat(lopDaysStr, 64); err == nil {
			lopDays = d
		}
	}
	if lopAmountStr != "" {
		if a, err := strconv.ParseFloat(lopAmountStr, 64); err == nil {
			lopAmount = a
		}
	}

	// Use userId from form if provided, otherwise use authenticated user
	targetUserID := userID
	if userIdStr != "" {
		targetUserID = userIdStr
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file uploaded",
		})
		return
	}

	req := services.UploadSalarySlipRequest{
		UserID:         targetUserID,
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
		LOPDays:        lopDays,
		LOPAmount:      lopAmount,
		FileHeader:     fileHeader,
	}

	salarySlip, err := h.salarySlipService.AddSalarySlip(req, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to add salary slip",
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

// DownloadSalarySlip handles salary slip download - returns file URL
func (h *SalarySlipHandler) DownloadSalarySlip(c *gin.Context) {
	salarySlipID := c.Param("id")

	salarySlip, err := h.salarySlipService.GetSalarySlip(salarySlipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Salary slip not found",
		})
		return
	}

	// Check if file exists on disk - handle both absolute and relative paths
	filePath := salarySlip.FilePath

	// If path doesn't start with '/', make it relative to current working directory
	if !strings.HasPrefix(filePath, "/") && !strings.HasPrefix(filePath, "./") {
		filePath = filepath.Join(".", filePath)
	}

	// Try multiple path variations
	possiblePaths := []string{
		filePath,
		filepath.Join(".", salarySlip.FilePath),
		filepath.Join("./uploads", "salary_slips", filepath.Base(salarySlip.FilePath)),
	}

	var fileExists bool

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			fileExists = true
			break
		}
	}

	if !fileExists {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "File not found on disk",
			"details": fmt.Sprintf("Tried paths: %v", possiblePaths),
		})
		return
	}

	// Generate the file URL for the frontend
	baseURL := "http://localhost:8080" // TODO: Make this configurable
	fileURL := fmt.Sprintf("%s/api/files/salary-slips/%s", baseURL, salarySlipID)

	// Return JSON response with file URL
	c.JSON(http.StatusOK, gin.H{
		"fileUrl":  fileURL,
		"fileName": salarySlip.FileName,
		"mimeType": salarySlip.MimeType,
	})
}

// ServeSalarySlipFile serves the actual salary slip file
func (h *SalarySlipHandler) ServeSalarySlipFile(c *gin.Context) {
	salarySlipID := c.Param("id")

	salarySlip, err := h.salarySlipService.GetSalarySlip(salarySlipID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Salary slip not found",
		})
		return
	}

	// Check if file exists on disk - handle both absolute and relative paths
	filePath := salarySlip.FilePath

	// If path doesn't start with '/', make it relative to current working directory
	if !strings.HasPrefix(filePath, "/") && !strings.HasPrefix(filePath, "./") {
		filePath = filepath.Join(".", filePath)
	}

	// Try multiple path variations
	possiblePaths := []string{
		filePath,
		filepath.Join(".", salarySlip.FilePath),
		filepath.Join("./uploads", "salary_slips", filepath.Base(salarySlip.FilePath)),
	}

	var actualFilePath string
	var fileExists bool

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			actualFilePath = path
			fileExists = true
			break
		}
	}

	if !fileExists {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "File not found on disk",
			"details": fmt.Sprintf("Tried paths: %v", possiblePaths),
		})
		return
	}

	// Set headers for file download
	c.Header("Content-Type", salarySlip.MimeType)
	c.Header("Content-Disposition", "inline; filename=\""+salarySlip.FileName+"\"")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

	// Serve the file using the actual found path
	c.File(actualFilePath)
}
