package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"hr-portal-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// AuditHandler handles audit-related HTTP requests
type AuditHandler struct {
	auditService services.AuditService
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(auditService services.AuditService) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
	}
}

// GetAuditLogs handles listing audit logs
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	organizationID := c.GetString("organization_id")
	userRole := c.GetString("user_role")

	// Debug logging
	logrus.WithFields(logrus.Fields{
		"organization_id": organizationID,
		"user_role":       userRole,
		"role_type":       fmt.Sprintf("%T", userRole),
	}).Info("Audit logs access attempt")

	// Only Admin, HR, and God roles can view audit logs
	if userRole != "Admin" && userRole != "HR" && userRole != "God" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions to view audit logs",
		})
		return
	}

	// Parse query parameters
	filters := make(map[string]interface{})

	if action := c.Query("action"); action != "" {
		filters["action"] = action
	}

	if entityType := c.Query("entity_type"); entityType != "" {
		filters["entity_type"] = entityType
	}

	if changedBy := c.Query("changed_by"); changedBy != "" {
		filters["changed_by"] = changedBy
	}

	if entityID := c.Query("entity_id"); entityID != "" {
		filters["entity_id"] = entityID
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters["limit"] = limit
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters["offset"] = offset
		}
	}

	auditLogs, err := h.auditService.GetAuditLogs(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch audit logs",
		})
		return
	}

	// If there are no audit logs, automatically add dummy logs (only for Admin/God)
	if len(auditLogs) == 0 && (userRole == "Admin" || userRole == "God") {
		if err := h.auditService.AddDummyLogs(organizationID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create sample audit logs",
			})
			return
		}

		// Fetch logs again after adding dummy logs
		auditLogs, err = h.auditService.GetAuditLogs(organizationID, filters)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to fetch audit logs after creating samples",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  auditLogs,
		"total": len(auditLogs),
	})
}

// GetUserAuditLogs handles getting audit logs for a specific user
func (h *AuditHandler) GetUserAuditLogs(c *gin.Context) {
	userID := c.Param("user_id")
	userRole := c.GetString("user_role")
	currentUserID := c.GetString("user_id")

	// Only Admin, HR, and God roles can view audit logs, or users can view their own
	if userRole != "Admin" && userRole != "HR" && userRole != "God" && currentUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions to view audit logs",
		})
		return
	}

	auditLogs, err := h.auditService.GetUserAuditLogs(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch user audit logs",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  auditLogs,
		"total": len(auditLogs),
	})
}

// GetEntityAuditLogs handles getting audit logs for a specific entity
func (h *AuditHandler) GetEntityAuditLogs(c *gin.Context) {
	entityType := c.Query("type")    // USER, DOCUMENT, LEAVE, etc.
	entityID := c.Query("entity_id") // ID of the entity
	userRole := c.GetString("user_role")

	// Only Admin, HR, and God roles can view entity audit logs
	if userRole != "Admin" && userRole != "HR" && userRole != "God" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions to view audit logs",
		})
		return
	}

	if entityType == "" || entityID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "entity_type and entity_id are required",
		})
		return
	}

	auditLogs, err := h.auditService.GetEntityAuditLogs(entityType, entityID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch entity audit logs",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  auditLogs,
		"total": len(auditLogs),
	})
}

// AddDummyLogs handles POST /api/audit/dummy-logs
func (h *AuditHandler) AddDummyLogs(c *gin.Context) {
	userRole := c.GetString("user_role")
	organizationID := c.GetString("organization_id")

	// Only Admin and God roles can add dummy logs
	if userRole != "Admin" && userRole != "God" {

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient permissions to add dummy logs",
		})
		return
	}

	err := h.auditService.AddDummyLogs(organizationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to add dummy logs",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Dummy audit logs added successfully",
	})
}
