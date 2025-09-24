package handlers

import (
	"encoding/json"
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// CompanyHandler handles company settings-related HTTP requests
type CompanyHandler struct {
	companySettingsService services.CompanySettingsService
}

// NewCompanyHandler creates a new company handler
func NewCompanyHandler(companySettingsService services.CompanySettingsService) *CompanyHandler {
	return &CompanyHandler{
		companySettingsService: companySettingsService,
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

	updatedSettings, err := h.companySettingsService.UpdateSettings(organizationID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update company settings",
		})
		return
	}

	c.JSON(http.StatusOK, updatedSettings)
}
