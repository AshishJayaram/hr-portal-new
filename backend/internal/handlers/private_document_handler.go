package handlers

import (
	"hr-portal-backend/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PrivateDocumentHandler struct {
	svc services.EmployeePrivateDocumentService
}

func NewPrivateDocumentHandler(svc services.EmployeePrivateDocumentService) *PrivateDocumentHandler {
	return &PrivateDocumentHandler{svc: svc}
}

func (h *PrivateDocumentHandler) Upload(c *gin.Context) {
	orgID := c.GetString("organization_id")
	// HR/Admin can pass userId; employees upload only for self
	userRole := c.GetString("user_role")
	authenticatedUserID := c.GetString("user_id")

	// Get userId from form data
	formUserID := c.PostForm("userId")

	// Determine which user ID to use
	var userID string
	if formUserID != "" && (userRole == "HR" || userRole == "Admin" || userRole == "God") {
		// HR/Admin/God can upload for other users
		userID = formUserID
	} else {
		// Employees can only upload for themselves
		userID = authenticatedUserID
	}

	title := c.PostForm("title")
	file, err := c.FormFile("file")
	if err != nil || title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing title or file"})
		return
	}
	doc, err := h.svc.Upload(userID, orgID, title, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": doc})
}

func (h *PrivateDocumentHandler) ListByUser(c *gin.Context) {
	userID := c.Param("user_id")
	docs, err := h.svc.ListByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": docs})
}

func (h *PrivateDocumentHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func (h *PrivateDocumentHandler) Download(c *gin.Context) {
	id := c.Param("id")
	doc, err := h.svc.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"fileUrl": doc.FileUrl})
}
