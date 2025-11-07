package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"hr-portal-backend/internal/repositories"
	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// CompanyHandler handles company settings-related HTTP requests
type CompanyHandler struct {
	companySettingsService services.CompanySettingsService
	auditService           services.AuditService
	organizationRepo       repositories.OrganizationRepository
}

// NewCompanyHandler creates a new company handler
func NewCompanyHandler(companySettingsService services.CompanySettingsService, auditService services.AuditService, organizationRepo repositories.OrganizationRepository) *CompanyHandler {
	return &CompanyHandler{
		companySettingsService: companySettingsService,
		auditService:           auditService,
		organizationRepo:       organizationRepo,
	}
}

// GetSettings handles getting company settings
func (h *CompanyHandler) GetSettings(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	settings, err := h.companySettingsService.GetSettings(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get company settings",
		})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateSettings handles updating company settings
func (h *CompanyHandler) UpdateSettings(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	var settings map[string]interface{}
	if err := c.ShouldBindJSON(&settings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
		})
		return
	}

	// Convert map to JSON string
	settingsJSON, err := json.Marshal(settings)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid settings format",
		})
		return
	}

	req := services.UpdateCompanySettingsRequest{
		Settings: string(settingsJSON),
	}

	// Get old settings for audit logging
	oldSettings, _ := h.companySettingsService.GetSettings(organizationID)
	var oldSettingsJSON string
	if oldSettings != nil {
		oldSettingsJSON = oldSettings.Settings
	}

	updatedSettings, err := h.companySettingsService.UpdateSettings(organizationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update company settings",
		})
		return
	}

	// Log audit entry for settings change
	userID := c.GetString("user_id")
	if userID == "" {
		// Try to get from header if not in context
		userID = c.GetHeader("X-User-ID")
	}
	if userID == "" {
		userID = "unknown"
	}

	changeSummary := "Company payroll settings updated"
	if err := h.auditService.LogAction(services.AuditActionRequest{
		OrganizationID: organizationID,
		Action:         "UPDATE",
		EntityType:     "COMPANY_SETTINGS",
		EntityID:       organizationID,
		ChangedBy:      userID,
		ChangeSummary:  changeSummary,
		OldValues:      oldSettingsJSON,
		NewValues:      updatedSettings.Settings,
	}, c.Request); err != nil {
		logrus.WithError(err).Warn("Failed to log audit entry for settings change")
	}

	logrus.WithFields(logrus.Fields{
		"organization_id": organizationID,
		"user_id":         userID,
		"action":          "UPDATE",
		"entity_type":     "COMPANY_SETTINGS",
	}).Info("Company settings updated")

	c.JSON(http.StatusOK, updatedSettings)
}

// GetKRASettings handles getting KRA settings
func (h *CompanyHandler) GetKRASettings(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	kraSettings, err := h.companySettingsService.GetKRASettings(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get KRA settings",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": kraSettings,
	})
}

// UpdateKRASettings handles updating KRA settings
func (h *CompanyHandler) UpdateKRASettings(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	var kraSettings map[string]interface{}
	if err := c.ShouldBindJSON(&kraSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Convert map to JSON string
	kraSettingsJSON, err := json.Marshal(kraSettings)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid KRA settings format",
			"details": err.Error(),
		})
		return
	}

	req := services.UpdateKRASettingsRequest{
		KRASettings: string(kraSettingsJSON),
	}

	updatedSettings, err := h.companySettingsService.UpdateKRASettings(organizationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update KRA settings",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "KRA settings updated successfully",
		"data":    updatedSettings,
	})
}

// UpdateOrganizationLogo handles POST /api/company/logo - allows HR/Admin to update their organization's logo
func (h *CompanyHandler) UpdateOrganizationLogo(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	if organizationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization ID is required"})
		return
	}

	// Get organization
	org, err := h.organizationRepo.GetByID(organizationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Organization not found"})
		return
	}

	// Get uploaded file
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file type
	allowedTypes := []string{".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"}
	ext := strings.ToLower(filepath.Ext(file.Filename))
	isValidType := false
	for _, allowedType := range allowedTypes {
		if ext == allowedType {
			isValidType = true
			break
		}
	}

	if !isValidType {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Allowed types: jpg, jpeg, png, gif, svg, webp"})
		return
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size too large. Maximum size is 5MB"})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("org_%s_logo%s", organizationID, ext)
	uploadPath := filepath.Join("uploads", "logos", filename)

	// Create directory if it doesn't exist
	dir := filepath.Dir(uploadPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Save uploaded file
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Update organization with logo URL
	logoURL := fmt.Sprintf("/api/files/logos/%s", filename)
	org.Logo = logoURL

	if err := h.organizationRepo.Update(org); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update organization"})
		return
	}

	// Log audit entry
	userID := c.GetString("user_id")
	if userID == "" {
		userID = c.GetHeader("X-User-ID")
	}
	if userID == "" {
		userID = "unknown"
	}

	changeSummary := "Organization logo updated"
	if err := h.auditService.LogAction(services.AuditActionRequest{
		OrganizationID: organizationID,
		Action:         "UPDATE",
		EntityType:     "ORGANIZATION",
		EntityID:       organizationID,
		ChangedBy:      userID,
		ChangeSummary:  changeSummary,
		OldValues:      nil,
		NewValues:      gin.H{"logo_url": logoURL},
	}, c.Request); err != nil {
		logrus.WithError(err).Warn("Failed to log audit entry for logo update")
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Logo updated successfully",
		"logo_url": logoURL,
	})
}
