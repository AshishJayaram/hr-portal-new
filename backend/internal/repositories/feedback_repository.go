package repositories

import (
	"fmt"
	"hr-portal-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type FeedbackRepository struct {
	DB *gorm.DB
}

func NewFeedbackRepository(db *gorm.DB) *FeedbackRepository {
	return &FeedbackRepository{DB: db}
}

func (r *FeedbackRepository) CreateFeedback(feedback *models.Feedback) (*models.Feedback, error) {
	// GORM automatically populates feedback.ID after Create
	if err := r.DB.Create(feedback).Error; err != nil {
		return nil, fmt.Errorf("failed to create feedback: %w", err)
	}

	// Verify ID was generated (should always be > 0)
	if feedback.ID == 0 {
		return nil, fmt.Errorf("failed to generate feedback ID")
	}

	// Reload with relationships to ensure complete data (ID is guaranteed to exist)
	var createdFeedback models.Feedback
	query := r.DB.Preload("Organization").Preload("Assignee").Preload("Resolver")

	// Only preload User if user_id is not null
	if feedback.UserID != nil {
		query = query.Preload("User")
	}

	if err := query.First(&createdFeedback, feedback.ID).Error; err != nil {
		// If reload fails, return the feedback anyway (ID is already set by Create)
		return feedback, nil
	}

	// Ensure ID is set in response
	createdFeedback.ID = feedback.ID
	return &createdFeedback, nil
}

func (r *FeedbackRepository) GetFeedback(organizationID uint, status *string, feedbackType *string, includeArchived bool) ([]models.Feedback, error) {
	var feedback []models.Feedback
	baseQuery := r.DB.Preload("User").Preload("Organization").Preload("Assignee").Preload("Resolver").
		Where("organization_id = ?", organizationID)

	// If including archived, use Unscoped() to include soft-deleted records and filter for deleted_at IS NOT NULL
	// If not including archived, GORM's Find() will automatically exclude soft-deleted items (deleted_at IS NULL)
	var query *gorm.DB
	if includeArchived {
		// Use Unscoped() to query soft-deleted records, then filter for only archived items
		query = baseQuery.Unscoped().Where("deleted_at IS NOT NULL")
	} else {
		// Regular query - GORM automatically excludes soft-deleted items
		query = baseQuery.Where("deleted_at IS NULL")
	}

	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if feedbackType != nil {
		query = query.Where("type = ?", *feedbackType)
	}

	err := query.Order("created_at DESC").Find(&feedback).Error
	return feedback, err
}

func (r *FeedbackRepository) GetFeedbackByID(id uint) (*models.Feedback, error) {
	var feedback models.Feedback
	err := r.DB.Preload("User").Preload("Organization").Preload("Assignee").Preload("Resolver").
		First(&feedback, id).Error
	return &feedback, err
}

func (r *FeedbackRepository) UpdateFeedback(feedback *models.Feedback) (*models.Feedback, error) {
	// Ensure ID is set before update
	if feedback.ID == 0 {
		return nil, fmt.Errorf("feedback ID is required for update")
	}

	if err := r.DB.Save(feedback).Error; err != nil {
		return nil, err
	}

	// Reload to ensure all fields including relationships are properly populated
	var updatedFeedback models.Feedback
	if err := r.DB.Preload("User").Preload("Organization").Preload("Assignee").Preload("Resolver").First(&updatedFeedback, feedback.ID).Error; err != nil {
		// If reload fails, return the original feedback
		return feedback, nil
	}
	return &updatedFeedback, nil
}

func (r *FeedbackRepository) UpdateFeedbackStatus(id uint, status string, assignedTo *uint, resolution *string, resolvedBy *uint) error {
	updates := map[string]interface{}{
		"status": status,
	}

	if assignedTo != nil {
		updates["assigned_to"] = assignedTo
	}

	if resolution != nil {
		updates["resolution"] = resolution
	}

	if resolvedBy != nil {
		updates["resolved_by"] = resolvedBy
		now := time.Now()
		updates["resolved_at"] = &now
	}

	return r.DB.Model(&models.Feedback{}).Where("id = ?", id).Updates(updates).Error
}

func (r *FeedbackRepository) DeleteFeedback(id uint) error {
	// Hard delete - permanently remove from database
	return r.DB.Unscoped().Delete(&models.Feedback{}, id).Error
}

func (r *FeedbackRepository) ArchiveFeedback(id uint) error {
	// Soft delete - set deleted_at timestamp
	return r.DB.Delete(&models.Feedback{}, id).Error
}

func (r *FeedbackRepository) DeleteAllFeedback(organizationID uint) error {
	// Hard delete all feedback for an organization - permanently remove from database
	return r.DB.Unscoped().Where("organization_id = ?", organizationID).Delete(&models.Feedback{}).Error
}

func (r *FeedbackRepository) GetFeedbackStats(organizationID uint) (map[string]int, error) {
	stats := make(map[string]int)

	// Count by status
	var statusCounts []struct {
		Status string
		Count  int
	}
	err := r.DB.Model(&models.Feedback{}).
		Select("status, count(*) as count").
		Where("organization_id = ?", organizationID).
		Group("status").
		Scan(&statusCounts).Error

	if err != nil {
		return nil, err
	}

	for _, count := range statusCounts {
		stats[count.Status] = count.Count
	}

	// Count by type
	var typeCounts []struct {
		Type  string
		Count int
	}
	err = r.DB.Model(&models.Feedback{}).
		Select("type, count(*) as count").
		Where("organization_id = ?", organizationID).
		Group("type").
		Scan(&typeCounts).Error

	if err != nil {
		return nil, err
	}

	for _, count := range typeCounts {
		stats["type_"+count.Type] = count.Count
	}

	return stats, nil
}
