package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type FeedbackHandler struct {
	service *services.FeedbackService
}

func NewFeedbackHandler(service *services.FeedbackService) *FeedbackHandler {
	return &FeedbackHandler{service: service}
}

func (h *FeedbackHandler) CreateFeedback(c *gin.Context) {
	// Get organization_id (required)
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id: organization not found"})
		return
	}

	orgIDUint, err := strconv.ParseUint(orgIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id format"})
		return
	}
	organizationID := uint(orgIDUint)

	// Get user_id (optional for anonymous feedback)
	var userID *uint
	var isAnonymous bool

	userIDStr, exists := c.Get("user_id")
	if exists {
		userIDUint, err := strconv.ParseUint(userIDStr.(string), 10, 32)
		if err == nil {
			uid := uint(userIDUint)
			userID = &uid
		}
	}

	// Check if this is a multipart form (with images) or JSON request
	contentType := c.GetHeader("Content-Type")

	if contentType == "application/json" {
		// Handle JSON request (existing functionality)
		var req struct {
			Title       string `json:"title" binding:"required"`
			Description string `json:"description" binding:"required"`
			Type        string `json:"type" binding:"required,oneof=bug feature improvement other"`
			Priority    string `json:"priority" binding:"omitempty,oneof=low medium high critical"`
			IsAnonymous bool   `json:"is_anonymous"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Set default priority if not provided
		if req.Priority == "" {
			req.Priority = "medium"
		}

		// If anonymous, clear userID
		if req.IsAnonymous {
			userID = nil
			isAnonymous = true
		}

		feedback, err := h.service.CreateFeedback(userID, organizationID, req.Title, req.Description, req.Type, req.Priority, isAnonymous)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Ensure ID is included in response
		if feedback.ID == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate feedback ID"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"data": feedback})
		return
	}

	// Handle multipart form request (with images)
	title := c.PostForm("title")
	description := c.PostForm("description")
	feedbackType := c.PostForm("type")
	priority := c.PostForm("priority")
	isAnonymousStr := c.PostForm("is_anonymous")

	if title == "" || description == "" || feedbackType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required fields"})
		return
	}

	// Set default priority if not provided
	if priority == "" {
		priority = "medium"
	}

	// Check if anonymous
	if isAnonymousStr == "true" || isAnonymousStr == "1" {
		userID = nil
		isAnonymous = true
	}

	// Get uploaded images
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	images := form.File["images"]

	feedback, err := h.service.CreateFeedbackWithImages(userID, organizationID, title, description, feedbackType, priority, isAnonymous, images, c.SaveUploadedFile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Ensure ID is included in response
	if feedback.ID == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate feedback ID"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": feedback})
}

func (h *FeedbackHandler) GetFeedback(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id: organization not found"})
		return
	}
	orgIDUint, err := strconv.ParseUint(orgIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id format"})
		return
	}
	organizationID := uint(orgIDUint)

	status := c.Query("status")
	feedbackType := c.Query("type")

	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	var typePtr *string
	if feedbackType != "" {
		typePtr = &feedbackType
	}

	feedback, err := h.service.GetFeedback(organizationID, statusPtr, typePtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": feedback})
}

func (h *FeedbackHandler) GetArchivedFeedback(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id: organization not found"})
		return
	}
	orgIDUint, err := strconv.ParseUint(orgIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id format"})
		return
	}
	organizationID := uint(orgIDUint)

	status := c.Query("status")
	var statusPtr *string
	if status != "" {
		statusPtr = &status
	}

	feedbackType := c.Query("type")
	var typePtr *string
	if feedbackType != "" {
		typePtr = &feedbackType
	}

	feedback, err := h.service.GetArchivedFeedback(organizationID, statusPtr, typePtr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": feedback})
}

func (h *FeedbackHandler) GetFeedbackByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	feedback, err := h.service.GetFeedbackByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Feedback not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": feedback})
}

func (h *FeedbackHandler) UpdateFeedbackStatus(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	var req struct {
		Status     string  `json:"status" binding:"required,oneof=open in_progress resolved closed"`
		AssignedTo *uint   `json:"assigned_to"`
		Resolution *string `json:"resolution"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id: user not authenticated"})
		return
	}
	userIDUint, err := strconv.ParseUint(userIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user_id format"})
		return
	}
	userID := uint(userIDUint)

	var resolvedBy *uint
	if req.Status == "resolved" || req.Status == "closed" {
		resolvedBy = &userID
	}

	err = h.service.UpdateFeedbackStatus(uint(id), req.Status, req.AssignedTo, req.Resolution, resolvedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback status updated successfully"})
}

func (h *FeedbackHandler) DeleteFeedback(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	err = h.service.DeleteFeedback(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback deleted successfully"})
}

func (h *FeedbackHandler) ArchiveFeedback(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	err = h.service.ArchiveFeedback(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feedback archived successfully"})
}

func (h *FeedbackHandler) DeleteAllFeedback(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id: organization not found"})
		return
	}
	orgIDUint, err := strconv.ParseUint(orgIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id format"})
		return
	}
	organizationID := uint(orgIDUint)

	err = h.service.DeleteAllFeedback(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All feedback deleted successfully"})
}

func (h *FeedbackHandler) GetFeedbackStats(c *gin.Context) {
	orgIDStr, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id: organization not found"})
		return
	}
	orgIDUint, err := strconv.ParseUint(orgIDStr.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization_id format"})
		return
	}
	organizationID := uint(orgIDUint)

	stats, err := h.service.GetFeedbackStats(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": stats})
}
