package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

type HolidayHandler struct {
	service services.HolidayService
}

func NewHolidayHandler(service services.HolidayService) *HolidayHandler {
	return &HolidayHandler{
		service: service,
	}
}

// GetAvailableYears returns financial years where holidays/events/notices exist
func (h *HolidayHandler) GetAvailableYears(c *gin.Context) {
	// Get organization ID from context (set by middleware)
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	years, err := h.service.GetAvailableYears(orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": years})
}

// CreateHoliday creates a new holiday/event/notice
func (h *HolidayHandler) CreateHoliday(c *gin.Context) {
	var req services.CreateHolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get organization ID from context (set by middleware)
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}
	req.OrganizationID = orgID.(string)

	holiday, err := h.service.CreateHoliday(req, c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": holiday})
}

// GetHoliday retrieves a specific holiday by ID
func (h *HolidayHandler) GetHoliday(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Holiday ID is required"})
		return
	}

	holiday, err := h.service.GetHoliday(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Holiday not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": holiday})
}

// ListHolidays retrieves all holidays for the organization
func (h *HolidayHandler) ListHolidays(c *gin.Context) {
	logrus.Info("DEBUG: ListHolidays method called!")

	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	// Parse query parameters for filtering
	filters := make(map[string]interface{})

	if typeFilter := c.Query("type"); typeFilter != "" {
		filters["type"] = typeFilter
	}

	if calendarEvent := c.Query("is_calendar_event"); calendarEvent != "" {
		if isCalendarEvent, err := strconv.ParseBool(calendarEvent); err == nil {
			filters["is_calendar_event"] = isCalendarEvent
		}
	}

	// Add year filtering for financial year categorization
	if yearFilter := c.Query("year"); yearFilter != "" {
		filters["year"] = yearFilter
		logrus.WithField("year_filter", yearFilter).Info("DEBUG: Added year filter")
	} else {
		logrus.Info("DEBUG: No year filter provided")
	}

	// Check if this is an upcoming request
	if upcoming := c.Query("upcoming"); upcoming == "true" {
		filters["upcoming"] = true
	}

	holidays, err := h.service.ListHolidays(orgID.(string), filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": holidays})
}

// GetUpcomingHolidaysAndEvents retrieves upcoming holidays and events for dashboard
func (h *HolidayHandler) GetUpcomingHolidaysAndEvents(c *gin.Context) {
	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	// Parse limit parameter (default to 5)
	limit := 5
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	holidays, err := h.service.GetUpcomingHolidaysAndEvents(orgID.(string), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": holidays})
}

// UpdateHoliday updates an existing holiday
func (h *HolidayHandler) UpdateHoliday(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Holiday ID is required"})
		return
	}

	var req services.UpdateHolidayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	holiday, err := h.service.UpdateHoliday(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": holiday})
}

// DeleteHoliday deletes a holiday
func (h *HolidayHandler) DeleteHoliday(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Holiday ID is required"})
		return
	}

	err := h.service.DeleteHoliday(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Holiday deleted successfully"})
}
