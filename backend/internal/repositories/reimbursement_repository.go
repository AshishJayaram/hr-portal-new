package repositories

import (
	"fmt"
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
	if err != nil {
		return reimbursements, err
	}

	// Set FileUrl for each bill in each reimbursement
	for i := range reimbursements {
		for j := range reimbursements[i].Bills {
			reimbursements[i].Bills[j].FileUrl = fmt.Sprintf("/api/files/reimbursement-bills/%d", reimbursements[i].Bills[j].ID)
		}
	}

	return reimbursements, nil
}

func (r *ReimbursementRepository) GetTeamReimbursements(organizationID, excludeUserID uint, status *string) ([]models.Reimbursement, error) {
	var reimbursements []models.Reimbursement
	query := r.DB.Preload("User").Preload("Approver").Preload("Rejecter").Preload("Returner").Preload("Bills").
		Where("organization_id = ? AND user_id != ?", organizationID, excludeUserID)

	if status != nil {
		query = query.Where("status = ?", *status)
	}

	err := query.Order("created_at DESC").Find(&reimbursements).Error
	if err != nil {
		return reimbursements, err
	}

	// Set FileUrl for each bill in each reimbursement
	for i := range reimbursements {
		for j := range reimbursements[i].Bills {
			reimbursements[i].Bills[j].FileUrl = fmt.Sprintf("/api/files/reimbursement-bills/%d", reimbursements[i].Bills[j].ID)
		}
	}

	return reimbursements, nil
}

func (r *ReimbursementRepository) GetReimbursementByID(id uint) (*models.Reimbursement, error) {
	var reimbursement models.Reimbursement
	err := r.DB.Preload("User").Preload("Approver").Preload("Rejecter").Preload("Returner").Preload("Bills").
		First(&reimbursement, id).Error
	if err != nil {
		return &reimbursement, err
	}

	// Set FileUrl for each bill
	for i := range reimbursement.Bills {
		reimbursement.Bills[i].FileUrl = fmt.Sprintf("/api/files/reimbursement-bills/%d", reimbursement.Bills[i].ID)
	}

	return &reimbursement, nil
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
	if err != nil {
		return bills, err
	}

	// Set FileUrl for each bill
	for i := range bills {
		bills[i].FileUrl = fmt.Sprintf("/api/files/reimbursement-bills/%d", bills[i].ID)
	}

	return bills, nil
}

func (r *ReimbursementRepository) DeleteReimbursement(id uint) error {
	return r.DB.Delete(&models.Reimbursement{}, id).Error
}

func (r *ReimbursementRepository) GetReimbursementBillByID(billID string) (*models.ReimbursementBill, error) {
	var bill models.ReimbursementBill
	err := r.DB.First(&bill, billID).Error
	if err != nil {
		return &bill, err
	}

	// Set FileUrl
	bill.FileUrl = fmt.Sprintf("/api/files/reimbursement-bills/%d", bill.ID)

	return &bill, nil
}
