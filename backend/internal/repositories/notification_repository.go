package repositories

import (
	"fmt"
	"strconv"

	"hr-portal-backend/internal/models"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// NotificationRepository interface for notification operations
type NotificationRepository interface {
	Create(notification *models.Notification) error
	GetByID(id string) (*models.Notification, error)
	GetByUserID(userID string, filters map[string]interface{}) ([]models.Notification, error)
	GetUnreadCountByUserID(userID string) (int64, error)
	MarkAsRead(id string) error
	MarkAllAsRead(userID string) error
	Delete(id string) error
}

// notificationRepository implements NotificationRepository interface
type notificationRepository struct {
	BaseRepository
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *gorm.DB, rdb *redis.Client) NotificationRepository {
	return &notificationRepository{
		BaseRepository: *NewBaseRepository(db, rdb),
	}
}

// Create creates a new notification
func (r *notificationRepository) Create(notification *models.Notification) error {
	if err := r.db.Create(notification).Error; err != nil {
		return fmt.Errorf("failed to create notification: %w", err)
	}
	return nil
}

// GetByID retrieves a notification by ID
func (r *notificationRepository) GetByID(id string) (*models.Notification, error) {
	var notification models.Notification
	if err := r.db.Where("id = ?", id).First(&notification).Error; err != nil {
		return nil, fmt.Errorf("notification not found: %w", err)
	}
	return &notification, nil
}

// GetByUserID retrieves all notifications for a user
func (r *notificationRepository) GetByUserID(userID string, filters map[string]interface{}) ([]models.Notification, error) {
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var notifications []models.Notification
	query := r.db.Where("user_id = ?", uint(userIDUint)).Order("created_at DESC")

	// Apply filters
	if isRead, ok := filters["is_read"]; ok {
		if isReadBool, ok := isRead.(bool); ok {
			query = query.Where("is_read = ?", isReadBool)
		}
	}

	if limit, ok := filters["limit"]; ok {
		if limitInt, ok := limit.(int); ok && limitInt > 0 {
			query = query.Limit(limitInt)
		}
	}

	if err := query.Find(&notifications).Error; err != nil {
		return nil, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, nil
}

// GetUnreadCountByUserID gets the count of unread notifications for a user
func (r *notificationRepository) GetUnreadCountByUserID(userID string) (int64, error) {
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid user ID: %w", err)
	}

	var count int64
	if err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", uint(userIDUint), false).
		Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count unread notifications: %w", err)
	}

	return count, nil
}

// MarkAsRead marks a notification as read
func (r *notificationRepository) MarkAsRead(id string) error {
	if err := r.db.Model(&models.Notification{}).
		Where("id = ?", id).
		Update("is_read", true).Error; err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}
	return nil
}

// MarkAllAsRead marks all notifications for a user as read
func (r *notificationRepository) MarkAllAsRead(userID string) error {
	userIDUint, err := strconv.ParseUint(userID, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	if err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", uint(userIDUint), false).
		Update("is_read", true).Error; err != nil {
		return fmt.Errorf("failed to mark all notifications as read: %w", err)
	}
	return nil
}

// Delete deletes a notification
func (r *notificationRepository) Delete(id string) error {
	if err := r.db.Delete(&models.Notification{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete notification: %w", err)
	}
	return nil
}

