package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type DocumentAcknowledgmentHandler struct {
	documentAcknowledgmentService services.DocumentAcknowledgmentService
}

func NewDocumentAcknowledgmentHandler(documentAcknowledgmentService services.DocumentAcknowledgmentService) *DocumentAcknowledgmentHandler {
	return &DocumentAcknowledgmentHandler{
		documentAcknowledgmentService: documentAcknowledgmentService,
	}
}

// AcknowledgeDocument acknowledges a document for the current user
func (h *DocumentAcknowledgmentHandler) AcknowledgeDocument(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	// Get user info from context - these are strings from middleware
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	orgIDStr := c.GetString("organization_id")
	if orgIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Organization not specified"})
		return
	}

	// Convert string IDs to uint
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	orgID, err := strconv.ParseUint(orgIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid organization ID"})
		return
	}

	err = h.documentAcknowledgmentService.AcknowledgeDocument(
		uint(documentID),
		uint(userID),
		uint(orgID),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Document acknowledged successfully"})
}

// GetDocumentAcknowledgments gets all acknowledgments for a document
func (h *DocumentAcknowledgmentHandler) GetDocumentAcknowledgments(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	acknowledgments, err := h.documentAcknowledgmentService.GetDocumentAcknowledgments(uint(documentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get acknowledgments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": acknowledgments})
}

// GetUserAcknowledgments gets all acknowledgments for the current user
func (h *DocumentAcknowledgmentHandler) GetUserAcknowledgments(c *gin.Context) {
	// Get user info from context - these are strings from middleware
	userIDStr := c.GetString("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Convert string ID to uint
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	acknowledgments, err := h.documentAcknowledgmentService.GetUserAcknowledgments(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get acknowledgments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": acknowledgments})
}

// GetAcknowledgedUsersForDocument gets all users who have acknowledged a document
func (h *DocumentAcknowledgmentHandler) GetAcknowledgedUsersForDocument(c *gin.Context) {
	documentIDStr := c.Param("id")
	documentID, err := strconv.ParseUint(documentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	users, err := h.documentAcknowledgmentService.GetAcknowledgedUsersForDocument(uint(documentID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get acknowledged users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": users})
}
