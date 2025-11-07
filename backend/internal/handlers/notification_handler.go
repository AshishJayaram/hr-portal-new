package handlers

import (
	"net/http"
	"strconv"

	"hr-portal-backend/internal/repositories"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// NotificationHandler handles notification-related HTTP requests
type NotificationHandler struct {
	notificationRepo repositories.NotificationRepository
	userRepo         repositories.UserRepository
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(notificationRepo repositories.NotificationRepository, userRepo repositories.UserRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
		userRepo:         userRepo,
	}
}

// GetNotifications handles GET /api/notifications
func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse query parameters
	filters := make(map[string]interface{})
	if isRead := c.Query("is_read"); isRead != "" {
		if isRead == "true" {
			filters["is_read"] = true
		} else if isRead == "false" {
			filters["is_read"] = false
		}
	}
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filters["limit"] = limit
		}
	}

	// Get notifications
	notifications, err := h.notificationRepo.GetByUserID(userID.(string), filters)
	if err != nil {
		logrus.WithError(err).Error("Failed to get notifications")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": notifications})
}

// GetUnreadCount handles GET /api/notifications/unread-count
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get unread count
	count, err := h.notificationRepo.GetUnreadCountByUserID(userID.(string))
	if err != nil {
		logrus.WithError(err).Error("Failed to get unread notification count")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get unread notification count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// MarkAsRead handles PUT /api/notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	notificationID := c.Param("id")
	if notificationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "notification_id parameter is required"})
		return
	}

	// Verify the notification belongs to the user
	notification, err := h.notificationRepo.GetByID(notificationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	userIDUint, err := strconv.ParseUint(userID.(string), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	if notification.UserID != uint(userIDUint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to mark this notification as read"})
		return
	}

	// Mark as read
	if err := h.notificationRepo.MarkAsRead(notificationID); err != nil {
		logrus.WithError(err).Error("Failed to mark notification as read")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

// MarkAllAsRead handles PUT /api/notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Mark all as read
	if err := h.notificationRepo.MarkAllAsRead(userID.(string)); err != nil {
		logrus.WithError(err).Error("Failed to mark all notifications as read")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

