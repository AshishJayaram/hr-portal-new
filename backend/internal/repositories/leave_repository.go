package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// leaveRepository implements LeaveRepository interface
type leaveRepository struct {
	*BaseRepository
}

func (r *leaveRepository) Create(leave *models.Leave) error {
	if err := r.db.Create(leave).Error; err != nil {
		return fmt.Errorf("failed to create leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) GetByID(id string) (*models.Leave, error) {
	var leave models.Leave
	if err := r.db.Preload("User").Preload("Category").Where("id = ?", id).First(&leave).Error; err != nil {
		return nil, fmt.Errorf("leave not found: %w", err)
	}
	return &leave, nil
}

func (r *leaveRepository) List(organizationID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave
	query := r.db.Preload("User").Preload("Category").Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to list leaves: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) Update(leave *models.Leave) error {
	if err := r.db.Save(leave).Error; err != nil {
		return fmt.Errorf("failed to update leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) Delete(id string) error {
	if err := r.db.Where("id = ?", id).Delete(&models.Leave{}).Error; err != nil {
		return fmt.Errorf("failed to delete leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) GetByUserID(userID string, filters map[string]interface{}) ([]models.Leave, error) {
	var leaves []models.Leave
	query := r.db.Preload("User").Preload("Category").Where("user_id = ?", userID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get user leaves: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) GetPendingApprovals(managerID string) ([]models.Leave, error) {
	var leaves []models.Leave
	if err := r.db.Preload("User").Preload("Category").
		Where("status = ? AND approver_id = ?", "pending", managerID).
		Find(&leaves).Error; err != nil {
		return nil, fmt.Errorf("failed to get pending approvals: %w", err)
	}
	return leaves, nil
}

func (r *leaveRepository) Approve(id, approverID string) error {
	if err := r.db.Model(&models.Leave{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":      "approved",
			"approver_id": approverID,
		}).Error; err != nil {
		return fmt.Errorf("failed to approve leave: %w", err)
	}
	return nil
}

func (r *leaveRepository) Reject(id, rejecterID, reason string) error {
	if err := r.db.Model(&models.Leave{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":           "rejected",
			"approver_id":      rejecterID,
			"rejection_reason": reason,
		}).Error; err != nil {
		return fmt.Errorf("failed to reject leave: %w", err)
	}
	return nil
}
