package repositories

import (
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
	err := r.DB.Create(feedback).Error
	return feedback, err
}

func (r *FeedbackRepository) GetFeedback(organizationID uint, status *string, feedbackType *string) ([]models.Feedback, error) {
	var feedback []models.Feedback
	query := r.DB.Preload("User").Preload("Assignee").Preload("Resolver").
		Where("organization_id = ?", organizationID)

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
	err := r.DB.Preload("User").Preload("Assignee").Preload("Resolver").
		First(&feedback, id).Error
	return &feedback, err
}

func (r *FeedbackRepository) UpdateFeedback(feedback *models.Feedback) (*models.Feedback, error) {
	err := r.DB.Save(feedback).Error
	return feedback, err
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
	return r.DB.Delete(&models.Feedback{}, id).Error
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
