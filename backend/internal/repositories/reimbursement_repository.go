package repositories

import (
	"hr-portal-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

type ReimbursementRepository struct {
	DB *gorm.DB
}

func NewReimbursementRepository(db *gorm.DB) *ReimbursementRepository {
	return &ReimbursementRepository{DB: db}
}

func (r *ReimbursementRepository) GetReimbursements(organizationID uint, userID *uint, status *string) ([]models.Reimbursement, error) {
	var reimbursements []models.Reimbursement
	query := r.DB.Preload("User").Preload("Approver").Preload("Rejecter").Preload("Returner").Preload("Bills").
		Where("organization_id = ?", organizationID)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.Order("created_at DESC").Find(&reimbursements).Error
	return reimbursements, err
}

func (r *ReimbursementRepository) GetReimbursementByID(id uint) (*models.Reimbursement, error) {
	var reimbursement models.Reimbursement
	err := r.DB.Preload("User").Preload("Approver").Preload("Rejecter").Preload("Returner").Preload("Bills").
		First(&reimbursement, id).Error
	return &reimbursement, err
}

func (r *ReimbursementRepository) UpdateReimbursementStatus(id uint, status string, approvedBy, rejectedBy, returnedBy *uint, rejectionReason, returnReason *string) error {
	updates := map[string]interface{}{
		"status": status,
	}

	now := time.Now()

	switch status {
	case "approved":
		updates["approved_by"] = approvedBy
		updates["approved_at"] = &now
	case "rejected":
		updates["rejected_by"] = rejectedBy
		updates["rejected_at"] = &now
		updates["rejection_reason"] = rejectionReason
	case "returned":
		updates["returned_by"] = returnedBy
		updates["returned_at"] = &now
		updates["return_reason"] = returnReason
	}

	return r.DB.Model(&models.Reimbursement{}).Where("id = ?", id).Updates(updates).Error
}

func (r *ReimbursementRepository) GetReimbursementBills(reimbursementID uint) ([]models.ReimbursementBill, error) {
	var bills []models.ReimbursementBill
	err := r.DB.Where("reimbursement_id = ?", reimbursementID).Find(&bills).Error
	return bills, err
}

func (r *ReimbursementRepository) DeleteReimbursement(id uint) error {
	return r.DB.Delete(&models.Reimbursement{}, id).Error
}
