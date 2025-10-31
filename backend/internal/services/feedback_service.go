package services

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"hr-portal-backend/internal/models"
	"hr-portal-backend/internal/repositories"
)

type FeedbackService struct {
	repo *repositories.FeedbackRepository
}

func NewFeedbackService(repo *repositories.FeedbackRepository) *FeedbackService {
	return &FeedbackService{repo: repo}
}

func (s *FeedbackService) CreateFeedback(userID *uint, organizationID uint, title, description, feedbackType, priority string, isAnonymous bool) (*models.Feedback, error) {
	feedback := &models.Feedback{
		UserID:         userID,
		OrganizationID: organizationID,
		IsAnonymous:    isAnonymous,
		Title:          title,
		Description:    description,
		Type:           feedbackType,
		Priority:       priority,
		Status:         "open",
	}

	return s.repo.CreateFeedback(feedback)
}

func (s *FeedbackService) GetFeedback(organizationID uint, status *string, feedbackType *string) ([]models.Feedback, error) {
	// Get feedback excluding archived items (soft-deleted)
	return s.repo.GetFeedback(organizationID, status, feedbackType, false)
}

func (s *FeedbackService) GetArchivedFeedback(organizationID uint, status *string, feedbackType *string) ([]models.Feedback, error) {
	// Get feedback including only archived items (soft-deleted)
	return s.repo.GetFeedback(organizationID, status, feedbackType, true)
}

func (s *FeedbackService) GetFeedbackByID(id uint) (*models.Feedback, error) {
	return s.repo.GetFeedbackByID(id)
}

func (s *FeedbackService) UpdateFeedbackStatus(id uint, status string, assignedTo *uint, resolution *string, resolvedBy *uint) error {
	return s.repo.UpdateFeedbackStatus(id, status, assignedTo, resolution, resolvedBy)
}

func (s *FeedbackService) DeleteFeedback(id uint) error {
	return s.repo.DeleteFeedback(id)
}

func (s *FeedbackService) ArchiveFeedback(id uint) error {
	return s.repo.ArchiveFeedback(id)
}

func (s *FeedbackService) DeleteAllFeedback(organizationID uint) error {
	return s.repo.DeleteAllFeedback(organizationID)
}

func (s *FeedbackService) GetFeedbackStats(organizationID uint) (map[string]int, error) {
	return s.repo.GetFeedbackStats(organizationID)
}

func (s *FeedbackService) CreateFeedbackWithImages(userID *uint, organizationID uint, title, description, feedbackType, priority string, isAnonymous bool, images []*multipart.FileHeader, saveFile func(*multipart.FileHeader, string) error) (*models.Feedback, error) {
	feedback := &models.Feedback{
		UserID:         userID,
		OrganizationID: organizationID,
		IsAnonymous:    isAnonymous,
		Title:          title,
		Description:    description,
		Type:           feedbackType,
		Priority:       priority,
		Status:         "open",
	}

	// Create feedback first
	createdFeedback, err := s.repo.CreateFeedback(feedback)
	if err != nil {
		return nil, err
	}

	// Handle image uploads if any
	if len(images) > 0 {
		uploadDir := "uploads/feedback"
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			return createdFeedback, fmt.Errorf("failed to create upload directory: %v", err)
		}

		for _, image := range images {
			// Generate unique filename
			timestamp := time.Now().Unix()
			ext := filepath.Ext(image.Filename)
			filename := fmt.Sprintf("%d_%s%s", timestamp, strconv.FormatUint(uint64(createdFeedback.ID), 10), ext)
			filePath := filepath.Join(uploadDir, filename)

			// Save file
			if err := saveFile(image, filePath); err != nil {
				continue // Skip failed uploads but continue with others
			}

			// Update description to include image reference
			imageUrl := fmt.Sprintf("/api/uploads/feedback/%s", filename)
			createdFeedback.Description += fmt.Sprintf("\n\n[Screenshot: %s](%s)", image.Filename, imageUrl)
		}

		// Update feedback with image references
		return s.repo.UpdateFeedback(createdFeedback)
	}

	return createdFeedback, nil
}
