package repositories

import (
	"fmt"

	"hr-portal-backend/internal/models"
)

// salarySlipRepository implements SalarySlipRepository interface
type salarySlipRepository struct {
	*BaseRepository
}

func (r *salarySlipRepository) Create(salarySlip *models.SalarySlip) error {
	if err := r.db.Create(salarySlip).Error; err != nil {
		return fmt.Errorf("failed to create salary slip: %w", err)
	}
	return nil
}

func (r *salarySlipRepository) GetByID(id string) (*models.SalarySlip, error) {
	var salarySlip models.SalarySlip
	if err := r.db.Preload("User").Where("id = ?", id).First(&salarySlip).Error; err != nil {
		return nil, fmt.Errorf("salary slip not found: %w", err)
	}
	return &salarySlip, nil
}

func (r *salarySlipRepository) List(organizationID string, filters map[string]interface{}) ([]models.SalarySlip, error) {
	var salarySlips []models.SalarySlip
	query := r.db.Preload("User").Where("organization_id = ?", organizationID)
	query = r.buildQuery(query, filters)

	if err := query.Find(&salarySlips).Error; err != nil {
		return nil, fmt.Errorf("failed to list salary slips: %w", err)
	}
	return salarySlips, nil
}

func (r *salarySlipRepository) Update(salarySlip *models.SalarySlip) error {
	if err := r.db.Save(salarySlip).Error; err != nil {
		return fmt.Errorf("failed to update salary slip: %w", err)
	}
	return nil
}

func (r *salarySlipRepository) Delete(id string) error {
	if err := r.db.Delete(&models.SalarySlip{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete salary slip: %w", err)
	}
	return nil
}

func (r *salarySlipRepository) GetByUserID(userID string) ([]models.SalarySlip, error) {
	var salarySlips []models.SalarySlip
	if err := r.db.Where("user_id = ?", userID).Order("year DESC, month DESC").Find(&salarySlips).Error; err != nil {
		return nil, fmt.Errorf("failed to get user salary slips: %w", err)
	}
	return salarySlips, nil
}
