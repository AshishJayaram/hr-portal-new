package handlers

import (
	"net/http"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// DocumentHandler handles document-related HTTP requests
type DocumentHandler struct {
	documentService services.DocumentService
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(documentService services.DocumentService) *DocumentHandler {
	return &DocumentHandler{
		documentService: documentService,
	}
}

// ListDocuments handles listing documents
func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	organizationID := c.GetString("organization_id")

	documents, err := h.documentService.ListDocuments(organizationID, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to list documents",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"documents": documents,
	})
}

// UploadDocument handles document upload
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	// Get document metadata
	title := c.PostForm("title")
	category := c.PostForm("category")

	req := services.UploadDocumentRequest{
		UserID:         userID,
		OrganizationID: organizationID,
		Title:          title,
		Category:       category,
		IsPublic:       false,
	}

	document, err := h.documentService.UploadDocument(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to upload document",
		})
		return
	}

	c.JSON(http.StatusCreated, document)
}

// GetDocument handles getting a specific document
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	documentID := c.Param("id")

	document, err := h.documentService.GetDocument(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Document not found",
		})
		return
	}

	c.JSON(http.StatusOK, document)
}

// DeleteDocument handles document deletion
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	documentID := c.Param("id")

	err := h.documentService.DeleteDocument(documentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete document",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Document deleted successfully",
	})
}

// DownloadDocument handles document download
func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	documentID := c.Param("id")

	document, err := h.documentService.GetDocument(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Document not found",
		})
		return
	}

	// For now, return a placeholder response
	// In a real implementation, you would serve the actual file
	c.JSON(http.StatusOK, gin.H{
		"message": "Document download - file path: " + document.FilePath,
	})
}
