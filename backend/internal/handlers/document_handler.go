package handlers

import (
	"net/http"
	"os"
	"strconv"

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
	loggedInUserID := c.GetString("user_id")
	loggedInUserRole := c.GetString("role")
	requestedUserID := c.Query("userId")

	// Create filter map based on access control
	filters := make(map[string]interface{})

	// Role-based access control:
	// - HR/Admin/God can see documents for any user in their organization
	// - Employees can only see their own documents + public documents
	if loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God" {
		// HR/Admin/God can access documents for any user
		if requestedUserID != "" {
			filters["user_id"] = requestedUserID
		}
		// If no requestedUserID specified, show all documents in organization
	} else {
		// Regular employees can only see their own documents + public documents
		// We'll handle this in the service layer to allow proper filtering
		filters["user_id_or_public"] = loggedInUserID
	}

	documents, err := h.documentService.ListDocuments(organizationID, filters)
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
	loggedInUserID := c.GetString("user_id")
	loggedInUserRole := c.GetString("role")

	// Get document metadata
	title := c.PostForm("title")
	category := c.PostForm("category")
	isPublicStr := c.PostForm("isPublic")
	targetUserID := c.PostForm("userId") // The user ID from form data (for Admin/HR uploading for employees)

	// Parse isPublic boolean
	isPublic := false
	if isPublicStr == "true" {
		isPublic = true
	}

	// Determine which user ID to use:
	// Admin/HR can upload documents FOR other users
	// Regular users can only upload documents for themselves
	var documentUserID string
	if targetUserID != "" && (loggedInUserRole == "Admin" || loggedInUserRole == "HR") {
		documentUserID = targetUserID // Admin/HR uploading for employee
	} else {
		documentUserID = loggedInUserID // Regular user or Admin/HR uploading for themselves
	}

	// Get uploaded file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No file uploaded",
		})
		return
	}

	req := services.UploadDocumentRequest{
		UserID:         documentUserID,
		OrganizationID: organizationID,
		Title:          title,
		Category:       category,
		IsPublic:       isPublic,
		FileHeader:     fileHeader,
	}

	document, err := h.documentService.UploadDocument(req, c.Request)
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
	loggedInUserID := c.GetString("user_id")
	loggedInUserRole := c.GetString("role")

	// First, get the document to check ownership/access permissions
	document, err := h.documentService.GetDocument(documentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Document not found",
		})
		return
	}

	// Role-based access control:
	// - HR/Admin/God can delete any document in their organization
	// - HR/Admin can upload documents for employees but employees should be able to delete their own
	// - Employees can only delete their own documents
	if loggedInUserRole == "HR" || loggedInUserRole == "Admin" || loggedInUserRole == "God" {
		// HR/Admin/God can delete any document in their organization
		// No additional permission check needed
	} else {
		// Regular employees can only delete their own documents
		if strconv.FormatUint(uint64(document.UserID), 10) != loggedInUserID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "You can only delete your own documents",
			})
			return
		}
	}

	err = h.documentService.DeleteDocument(documentID, c.Request)
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

	// Check if file exists on disk
	if _, err := os.Stat(document.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "File not found on disk",
		})
		return
	}

	// Set headers for file download
	c.Header("Content-Type", document.MimeType)
	c.Header("Content-Disposition", "inline; filename=\""+document.FileName+"\"")
	c.Header("Access-Control-Allow-Origin", "*")
	c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

	// Serve the file
	c.File(document.FilePath)
}
