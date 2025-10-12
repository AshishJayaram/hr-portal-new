package services

import (
	"fmt"
	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

type ReimbursementService struct {
	repo     *repositories.ReimbursementRepository
	userRepo repositories.UserRepository
}

func NewReimbursementService(repo *repositories.ReimbursementRepository, userRepo repositories.UserRepository) *ReimbursementService {
	return &ReimbursementService{
		repo:     repo,
		userRepo: userRepo,
	}
}

func (s *ReimbursementService) CreateReimbursement(userID, organizationID uint, reason string, amount float64, date time.Time, bills []*multipart.FileHeader) (*models.Reimbursement, error) {
	// Create reimbursement record
	reimbursement := &models.Reimbursement{
		UserID:         userID,
		OrganizationID: organizationID,
		Reason:         reason,
		Amount:         amount,
		Date:           date,
		Status:         "pending",
	}

	// Start transaction
	tx := s.repo.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create reimbursement
	if err := tx.Create(reimbursement).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Upload bills
	for _, bill := range bills {
		billPath, err := s.uploadBill(bill, reimbursement.ID)
		if err != nil {
			tx.Rollback()
			return nil, err
		}

		reimbursementBill := &models.ReimbursementBill{
			ReimbursementID: reimbursement.ID,
			FileName:        bill.Filename,
			FilePath:        billPath,
			FileSize:        bill.Size,
			MimeType:        bill.Header.Get("Content-Type"),
		}

		if err := tx.Create(reimbursementBill).Error; err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return reimbursement, nil
}

func (s *ReimbursementService) GetReimbursements(organizationID uint, userID *uint, status *string) ([]models.Reimbursement, error) {
	return s.repo.GetReimbursements(organizationID, userID, status)
}

// GetReimbursementsForUser returns reimbursements for a user and their subordinates if they're a manager
func (s *ReimbursementService) GetReimbursementsForUser(organizationID, userID uint, status *string) ([]models.Reimbursement, error) {
	// Get user's own reimbursements
	uid := userID
	ownReimbursements, err := s.repo.GetReimbursements(organizationID, &uid, status)
	if err != nil {
		return nil, err
	}

	// If user has subordinates, get their reimbursements too
	subordinates, err := s.userRepo.GetSubordinates(fmt.Sprintf("%d", organizationID), fmt.Sprintf("%d", userID))
	if err != nil || len(subordinates) == 0 {
		return ownReimbursements, nil
	}

	// Collect all reimbursements
	allReimbursements := ownReimbursements
	for _, subordinate := range subordinates {
		subordinateID := subordinate.ID
		subordinateReimbursements, err := s.repo.GetReimbursements(organizationID, &subordinateID, status)
		if err != nil {
			continue // Skip if error fetching subordinate's reimbursements
		}
		allReimbursements = append(allReimbursements, subordinateReimbursements...)
	}

	return allReimbursements, nil
}

func (s *ReimbursementService) GetReimbursementByID(id uint) (*models.Reimbursement, error) {
	return s.repo.GetReimbursementByID(id)
}

func (s *ReimbursementService) ApproveReimbursement(id, approvedBy uint) error {
	return s.repo.UpdateReimbursementStatus(id, "approved", &approvedBy, nil, nil, nil, nil)
}

func (s *ReimbursementService) RejectReimbursement(id, rejectedBy uint, reason string) error {
	return s.repo.UpdateReimbursementStatus(id, "rejected", nil, &rejectedBy, nil, &reason, nil)
}

func (s *ReimbursementService) ReturnReimbursement(id, returnedBy uint, reason string) error {
	return s.repo.UpdateReimbursementStatus(id, "returned", nil, nil, &returnedBy, nil, &reason)
}

func (s *ReimbursementService) uploadBill(bill *multipart.FileHeader, reimbursementID uint) (string, error) {
	// Create uploads directory if it doesn't exist
	uploadDir := "uploads/reimbursements"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", err
	}

	// Generate unique filename
	timestamp := time.Now().Unix()
	filename := fmt.Sprintf("%d_%s", timestamp, bill.Filename)
	filePath := filepath.Join(uploadDir, filename)

	// Open uploaded file
	src, err := bill.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy file content
	if _, err = io.Copy(dst, src); err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *ReimbursementService) GetReimbursementBills(reimbursementID uint) ([]models.ReimbursementBill, error) {
	return s.repo.GetReimbursementBills(reimbursementID)
}

func (s *ReimbursementService) DeleteReimbursement(id uint) error {
	return s.repo.DeleteReimbursement(id)
}
