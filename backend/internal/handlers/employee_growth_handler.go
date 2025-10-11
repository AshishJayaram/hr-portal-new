package handlers

import (
	"net/http"
	"strconv"
	"time"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type EmployeeGrowthHandler struct {
	service *services.EmployeeGrowthService
}

func NewEmployeeGrowthHandler(service *services.EmployeeGrowthService) *EmployeeGrowthHandler {
	return &EmployeeGrowthHandler{service: service}
}

func (h *EmployeeGrowthHandler) CreateGrowthRecord(c *gin.Context) {
	organizationID := c.GetUint("organization_id")
	addedBy := c.GetUint("user_id")

	var req struct {
		UserID      string `json:"user_id" binding:"required"`
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		Type        string `json:"type" binding:"required,oneof=promotion skill_development certification project_completion achievement milestone"`
		Date        string `json:"date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse user ID
	userID, err := strconv.ParseUint(req.UserID, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	growth, err := h.service.CreateGrowthRecord(uint(userID), organizationID, addedBy, req.Title, req.Description, req.Type, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": growth})
}

func (h *EmployeeGrowthHandler) GetEmployeeGrowth(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	growth, err := h.service.GetEmployeeGrowth(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": growth})
}

func (h *EmployeeGrowthHandler) GetGrowthRecordByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	growth, err := h.service.GetGrowthRecordByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Growth record not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": growth})
}

func (h *EmployeeGrowthHandler) UpdateGrowthRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Title       string `json:"title" binding:"required"`
		Description string `json:"description"`
		Type        string `json:"type" binding:"required,oneof=promotion skill_development certification project_completion achievement milestone"`
		Date        string `json:"date" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	err = h.service.UpdateGrowthRecord(uint(id), req.Title, req.Description, req.Type, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Growth record updated successfully"})
}

func (h *EmployeeGrowthHandler) DeleteGrowthRecord(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	err = h.service.DeleteGrowthRecord(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Growth record deleted successfully"})
}

func (h *EmployeeGrowthHandler) GetGrowthStats(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	stats, err := h.service.GetGrowthStats(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}
